(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
"[project]/components/calendar/view.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */ /**
 * The in-app booking calendar (day / week), pure parts: date ranges in the
 * calendar's zone, block layout (overlaps side by side), open-hour shading,
 * status styles, and the row -> event mapping for homeowner calls, on-site
 * visits and sales meetings. No I/O; shared by the page, the client views,
 * the server actions and the tests. Every instant is UTC epoch ms; wall
 * clock only ever appears in the calendar's own zone.
 */ __turbopack_context__.s([
    "SOURCE_LABELS",
    ()=>SOURCE_LABELS,
    "dayLabel",
    ()=>dayLabel,
    "designFromActivity",
    ()=>designFromActivity,
    "designsByLead",
    ()=>designsByLead,
    "isLive",
    ()=>isLive,
    "layoutDay",
    ()=>layoutDay,
    "longDayLabel",
    ()=>longDayLabel,
    "mapAppointmentRow",
    ()=>mapAppointmentRow,
    "mapSalesRow",
    ()=>mapSalesRow,
    "openBands",
    ()=>openBands,
    "parseViewDate",
    ()=>parseViewDate,
    "parseViewMode",
    ()=>parseViewMode,
    "rangeTitle",
    ()=>rangeTitle,
    "shiftViewDate",
    ()=>shiftViewDate,
    "sourceLabel",
    ()=>sourceLabel,
    "statusActions",
    ()=>statusActions,
    "statusStyle",
    ()=>statusStyle,
    "viewRange",
    ()=>viewRange,
    "visibleHours",
    ()=>visibleHours,
    "weekStart",
    ()=>weekStart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/availability/time.ts [app-client] (ecmascript)");
;
/* ------------------------------------------------------------------ */ /* Dates                                                               */ /* ------------------------------------------------------------------ */ const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function parseViewDate(value, timeZone, nowMs = Date.now()) {
    if (value && DATE_RE.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        const t = new Date(Date.UTC(y, m - 1, d));
        if (t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d) return value;
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(nowMs, timeZone).date;
}
const parseViewMode = (value)=>value === 'day' ? 'day' : 'week';
function weekStart(date) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(date, -(((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["weekdayOfDate"])(date) + 6) % 7));
}
function viewRange(mode, date, timeZone) {
    const first = mode === 'week' ? weekStart(date) : date;
    const days = Array.from({
        length: mode === 'week' ? 7 : 1
    }, (_, i)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(first, i));
    return {
        days,
        fromMs: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])(days[0], 0, timeZone),
        toMs: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(days[days.length - 1], 1), 0, timeZone)
    };
}
function shiftViewDate(mode, date, direction) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(date, direction * (mode === 'week' ? 7 : 1));
}
const titleFmt = new Map();
function fmt(opts) {
    const key = JSON.stringify(opts);
    let f = titleFmt.get(key);
    if (!f) {
        // Dates here are zone-free calendar days, rendered at UTC noon.
        f = new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC',
            ...opts
        });
        titleFmt.set(key, f);
    }
    return f;
}
const noon = (date)=>{
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12));
};
const dayLabel = (date)=>fmt({
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    }).format(noon(date));
const longDayLabel = (date)=>fmt({
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    }).format(noon(date));
function rangeTitle(mode, days) {
    if (mode === 'day' || days.length === 1) return fmt({
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(noon(days[0]));
    const a = noon(days[0]);
    const b = noon(days[days.length - 1]);
    const sameMonth = a.getUTCMonth() === b.getUTCMonth();
    const left = fmt({
        month: 'short',
        day: 'numeric'
    }).format(a);
    const right = sameMonth ? fmt({
        day: 'numeric'
    }).format(b) : fmt({
        month: 'short',
        day: 'numeric'
    }).format(b);
    return `${left} – ${right}, ${b.getUTCFullYear()}`;
}
/** Minutes from the day's local midnight (handles DST days: midnight-to-midnight may be 23 or 25 h). */ function minutesInto(date, ms, timeZone) {
    return Math.round((ms - (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])(date, 0, timeZone)) / 60_000);
}
function layoutDay(events, date, timeZone) {
    const dayLen = minutesInto(date, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zonedToUtc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(date, 1), 0, timeZone), timeZone);
    const mine = events.filter((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(e.startMs, timeZone).date === date).map((event)=>{
        const startMin = Math.max(0, minutesInto(date, event.startMs, timeZone));
        const endMin = Math.min(dayLen, Math.max(startMin + 15, minutesInto(date, event.endMs, timeZone)));
        return {
            event,
            startMin,
            endMin,
            lane: 0,
            lanes: 1
        };
    }).sort((a, b)=>a.startMin - b.startMin || b.endMin - a.endMin || a.event.id.localeCompare(b.event.id));
    // Clusters of transitively overlapping events share one lane count.
    let cluster = [];
    let clusterEnd = -1;
    const flush = ()=>{
        const lanes = Math.max(1, ...cluster.map((p)=>p.lane + 1));
        for (const p of cluster)p.lanes = lanes;
        cluster = [];
    };
    for (const p of mine){
        if (cluster.length && p.startMin >= clusterEnd) flush();
        const laneEnds = [];
        for (const q of cluster)laneEnds[q.lane] = Math.max(laneEnds[q.lane] ?? -1, q.endMin);
        let lane = 0;
        while(laneEnds[lane] !== undefined && laneEnds[lane] > p.startMin)lane++;
        p.lane = lane;
        cluster.push(p);
        clusterEnd = Math.max(clusterEnd, p.endMin);
    }
    if (cluster.length) flush();
    return mine;
}
function openBands(rules, date) {
    const wd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["weekdayOfDate"])(date);
    return rules.filter((r)=>r.weekday === wd).map((r)=>({
            startMin: r.startMinute,
            endMin: r.endMinute
        })).sort((a, b)=>a.startMin - b.startMin);
}
function visibleHours(rules, placed) {
    let start = 8 * 60;
    let end = 18 * 60;
    for (const r of rules){
        start = Math.min(start, r.startMinute);
        end = Math.max(end, r.endMinute);
    }
    for (const p of placed){
        start = Math.min(start, p.startMin);
        end = Math.max(end, p.endMin);
    }
    return {
        startHour: Math.max(0, Math.floor(start / 60)),
        endHour: Math.min(24, Math.ceil(end / 60))
    };
}
function isLive(kind, status) {
    return kind === 'sales_appointment' ? [
        'scheduled',
        'confirmed',
        'rescheduled'
    ].includes(status) : status === 'scheduled';
}
const STATUS = {
    scheduled: {
        label: 'Scheduled',
        block: 'border-l-blue-600 bg-blue-50 text-blue-950 dark:bg-blue-950/50 dark:text-blue-50',
        dot: 'bg-blue-600'
    },
    confirmed: {
        label: 'Confirmed',
        block: 'border-l-blue-600 bg-blue-50 text-blue-950 dark:bg-blue-950/50 dark:text-blue-50',
        dot: 'bg-blue-600'
    },
    rescheduled: {
        label: 'Rescheduled',
        block: 'border-l-blue-600 bg-blue-50 text-blue-950 dark:bg-blue-950/50 dark:text-blue-50',
        dot: 'bg-blue-600'
    },
    held: {
        label: 'Held',
        block: 'border-l-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-50',
        dot: 'bg-emerald-600'
    },
    completed: {
        label: 'Held',
        block: 'border-l-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-50',
        dot: 'bg-emerald-600'
    },
    no_show: {
        label: 'No-show',
        block: 'border-l-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/50 dark:text-amber-50',
        dot: 'bg-amber-500'
    },
    cancelled: {
        label: 'Cancelled',
        block: 'border-l-muted-foreground/50 bg-muted text-muted-foreground line-through decoration-muted-foreground/60',
        dot: 'bg-muted-foreground/60'
    }
};
const VISIT = {
    label: 'On-site visit',
    block: 'border-l-slate-500 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
    dot: 'bg-slate-500'
};
function statusStyle(kind, status) {
    if (kind === 'visit' && status === 'scheduled') return VISIT;
    return STATUS[status] ?? STATUS.scheduled;
}
function statusActions(kind, status, startMs, nowMs) {
    if (status === 'cancelled') return [];
    // Held / no-show only once the call time has come (or to correct an earlier outcome).
    if (startMs > nowMs && isLive(kind, status)) return [];
    const held = kind === 'sales_appointment' ? 'completed' : 'held';
    const out = [
        {
            value: held,
            label: 'Held'
        },
        {
            value: 'no_show',
            label: 'No-show'
        }
    ].filter((a)=>a.value !== status);
    return out;
}
const SOURCE_LABELS = {
    funnel: 'Website funnel',
    estimator: 'Instant estimator',
    manual: 'Booked by the team',
    sales_funnel: 'Contractor sales funnel',
    ai: 'AI assistant',
    workflow: 'Automation'
};
const sourceLabel = (source)=>source ? SOURCE_LABELS[source] ?? source : null;
/* ------------------------------------------------------------------ */ /* Rows -> events                                                      */ /* ------------------------------------------------------------------ */ const DEFAULT_LEN_MS = 30 * 60_000;
const VISIT_LEN_MS = 60 * 60_000;
const str = (v)=>typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
const one = (v)=>Array.isArray(v) ? v[0] ?? null : v ?? null;
function endOf(startMs, endsAt, fallbackMs) {
    const e = typeof endsAt === 'string' ? Date.parse(endsAt) : NaN;
    return Number.isFinite(e) && e > startMs ? e : startMs + fallbackMs;
}
function mapAppointmentRow(r, design = null) {
    const startMs = r.scheduled_at ? Date.parse(r.scheduled_at) : NaN;
    if (!Number.isFinite(startMs)) return null;
    const assignment = one(r.assignment);
    const lead = one(r.lead) ?? one(assignment?.lead);
    const name = [
        str(lead?.first_name),
        str(lead?.last_name)
    ].filter(Boolean).join(' ') || str(r.contact_name) || str(lead?.phone) || str(r.contact_phone) || 'Homeowner';
    const project = [
        str(one(lead?.vertical)?.name),
        str(one(lead?.sub_service)?.name)
    ].filter(Boolean).join(' · ') || null;
    const kind = r.calendar_id ? 'appointment' : 'visit';
    return {
        id: r.id,
        kind,
        status: r.status ?? 'scheduled',
        startMs,
        endMs: endOf(startMs, r.ends_at, kind === 'visit' ? VISIT_LEN_MS : DEFAULT_LEN_MS),
        title: name,
        subtitle: project,
        phone: str(r.contact_phone) ?? str(lead?.phone),
        email: str(r.contact_email) ?? str(lead?.email),
        city: str(lead?.city),
        leadId: lead?.id ?? r.lead_id ?? null,
        prospectId: null,
        source: str(r.source),
        meetingType: str(r.meeting_type) ?? (kind === 'visit' ? 'in_person' : null),
        location: str(r.location),
        notes: str(r.notes),
        contractorName: str(one(assignment?.contractor)?.name),
        cancelReason: str(r.cancel_reason),
        rescheduleCount: Number(r.reschedule_count ?? 0) || 0,
        design
    };
}
function mapSalesRow(r) {
    const startMs = r.scheduled_at ? Date.parse(r.scheduled_at) : NaN;
    if (!Number.isFinite(startMs)) return null;
    const p = one(r.prospect);
    const company = str(p?.company_name);
    return {
        id: r.id,
        kind: 'sales_appointment',
        status: r.status ?? 'scheduled',
        startMs,
        endMs: endOf(startMs, r.ends_at, DEFAULT_LEN_MS),
        title: str(r.decision_maker_name) ?? company ?? 'Contractor prospect',
        subtitle: str(r.decision_maker_name) ? company : null,
        phone: str(p?.phone),
        email: str(p?.email),
        city: str(p?.city),
        leadId: null,
        prospectId: p?.id ?? r.prospect_id ?? null,
        source: str(r.source),
        meetingType: str(r.appointment_type),
        location: str(r.contact_info),
        notes: str(r.notes),
        contractorName: null,
        cancelReason: str(r.cancel_reason),
        rescheduleCount: Number(r.reschedule_count ?? 0) || 0,
        design: null
    };
}
const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});
const isHttps = (v)=>typeof v === 'string' && /^https?:\/\//i.test(v);
function designFromActivity(metadata) {
    const est = metadata?.estimator;
    if (!est || typeof est !== 'object') return null;
    const conf = est.configurator && typeof est.configurator === 'object' ? est.configurator : null;
    const lines = Array.isArray(conf?.summary) ? conf.summary.filter((l)=>typeof l === 'string' && l.trim() !== '').slice(0, 12) : [];
    const photos = Array.isArray(conf?.photos) ? conf.photos : [];
    const firstPhoto = photos.find((p)=>isHttps(p?.url));
    const low = typeof est.low === 'number' ? est.low : null;
    const high = typeof est.high === 'number' ? est.high : null;
    const range = low !== null && high !== null ? low === high ? usd.format(low) : `${usd.format(low)} – ${usd.format(high)}` : null;
    const designUrl = isHttps(conf?.designUrl) ? conf.designUrl : null;
    if (!lines.length && !firstPhoto && !range && !designUrl) return null;
    return {
        lines,
        photo: firstPhoto ? {
            url: firstPhoto.url,
            alt: typeof firstPhoto.alt === 'string' ? firstPhoto.alt : 'Design photo'
        } : null,
        designUrl,
        range
    };
}
function designsByLead(rows) {
    const out = new Map();
    for (const r of rows){
        if (out.has(r.lead_id)) continue;
        const d = designFromActivity(r.metadata);
        if (d) out.set(r.lead_id, d);
    }
    return out;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calendar/agenda-list.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AgendaList",
    ()=>AgendaList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-client] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/availability/time.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/view.ts [app-client] (ecmascript)");
'use client';
;
;
;
;
;
;
function AgendaList({ days, events, timeZone, today, onSelect, className }) {
    const byDay = new Map();
    for (const e of events){
        const d = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(e.startMs, timeZone).date;
        byDay.set(d, [
            ...byDay.get(d) ?? [],
            e
        ]);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('space-y-4', className),
        "data-calendar-agenda": "",
        children: days.map((d)=>{
            const list = byDay.get(d) ?? [];
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-labelledby": `agenda-${d}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        id: `agenda-${d}`,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('mb-1.5 text-sm font-semibold', d === today ? 'text-primary' : 'text-foreground'),
                        children: [
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["longDayLabel"])(d),
                            d === today ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "ml-1.5 text-xs font-medium text-muted-foreground",
                                children: "Today"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/agenda-list.tsx",
                                lineNumber: 42,
                                columnNumber: 30
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/agenda-list.tsx",
                        lineNumber: 40,
                        columnNumber: 13
                    }, this),
                    list.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground",
                        children: "Nothing booked"
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/agenda-list.tsx",
                        lineNumber: 45,
                        columnNumber: 15
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "divide-y overflow-hidden rounded-xl border bg-card",
                        children: list.map((e)=>{
                            const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["statusStyle"])(e.kind, e.status);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>onSelect(e),
                                    className: "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-accent",
                                    "data-calendar-event": e.id,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            "aria-hidden": true,
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('size-2.5 shrink-0 rounded-full', s.dot)
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/agenda-list.tsx",
                                            lineNumber: 58,
                                            columnNumber: 25
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "min-w-0 flex-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('block truncate text-sm font-medium', e.status === 'cancelled' && 'text-muted-foreground line-through'),
                                                    children: e.title
                                                }, void 0, false, {
                                                    fileName: "[project]/components/calendar/agenda-list.tsx",
                                                    lineNumber: 60,
                                                    columnNumber: 27
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "block truncate text-xs text-muted-foreground",
                                                    children: [
                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(e.startMs, e.endMs, timeZone),
                                                        e.subtitle ? ` · ${e.subtitle}` : ''
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/calendar/agenda-list.tsx",
                                                    lineNumber: 61,
                                                    columnNumber: 27
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/calendar/agenda-list.tsx",
                                            lineNumber: 59,
                                            columnNumber: 25
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "shrink-0 text-xs text-muted-foreground",
                                            children: s.label
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/agenda-list.tsx",
                                            lineNumber: 66,
                                            columnNumber: 25
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                            "aria-hidden": true,
                                            className: "size-4 shrink-0 text-muted-foreground"
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/agenda-list.tsx",
                                            lineNumber: 67,
                                            columnNumber: 25
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calendar/agenda-list.tsx",
                                    lineNumber: 52,
                                    columnNumber: 23
                                }, this)
                            }, `${e.kind}:${e.id}`, false, {
                                fileName: "[project]/components/calendar/agenda-list.tsx",
                                lineNumber: 51,
                                columnNumber: 21
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/agenda-list.tsx",
                        lineNumber: 47,
                        columnNumber: 15
                    }, this)
                ]
            }, d, true, {
                fileName: "[project]/components/calendar/agenda-list.tsx",
                lineNumber: 39,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/components/calendar/agenda-list.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
_c = AgendaList;
var _c;
__turbopack_context__.k.register(_c, "AgendaList");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/actions/data:c186f3 [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"405f3c869d895dbcb191585bdb3595dfb0ed0fdcc6":"bookCallOnBehalf"},"lib/actions/booking.ts",""] */ __turbopack_context__.s([
    "bookCallOnBehalf",
    ()=>bookCallOnBehalf
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var bookCallOnBehalf = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("405f3c869d895dbcb191585bdb3595dfb0ed0fdcc6", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "bookCallOnBehalf"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYm9va2luZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcic7XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgLS0gcm93cyBjb21lIGZyb20gdGhlIHVudHlwZWQgU3VwYWJhc2UgY2xpZW50LCBhcyBlbHNld2hlcmUgaW4gbGliL2RhdGEgKi9cbmltcG9ydCB7IHJldmFsaWRhdGVQYXRoIH0gZnJvbSAnbmV4dC9jYWNoZSc7XG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcbmltcG9ydCB7IHJlcXVpcmVQcm9maWxlIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9zZXJ2ZXInO1xuaW1wb3J0IHsgY3JlYXRlQWRtaW5DbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9hZG1pbic7XG5pbXBvcnQgeyBnZXRTbG90cyB9IGZyb20gJ0AvbGliL2Jvb2tpbmcvc2xvdHMuc2VydmVyJztcbmltcG9ydCB7XG4gIGJvb2tBcHBvaW50bWVudCxcbiAgYm9va1NhbGVzQXBwb2ludG1lbnQsXG4gIGNhbmNlbEFwcG9pbnRtZW50LFxuICBjYW5jZWxTYWxlc0FwcG9pbnRtZW50LFxuICByZXNjaGVkdWxlQXBwb2ludG1lbnQsXG4gIHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50LFxufSBmcm9tICdAL2xpYi9ib29raW5nL2Jvb2suc2VydmVyJztcbmltcG9ydCB7IG5vdGlmeUJvb2tpbmdTb29uIH0gZnJvbSAnQC9saWIvYm9va2luZy9ub3RpZnkuc2VydmVyJztcbmltcG9ydCB7IEJPT0tJTkdfRVJST1JfTUVTU0FHRVMsIG1hcENhbGVuZGFyLCBQSUNLX0FOT1RIRVJfVElNRSwgdHlwZSBCb29raW5nQ2FsZW5kYXIsIHR5cGUgQm9va2luZ0Vycm9yIH0gZnJvbSAnQC9saWIvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgeyBpc1ZhbGlkVGltZVpvbmUgfSBmcm9tICdAL2xpYi9hdmFpbGFiaWxpdHkvdGltZSc7XG5pbXBvcnQgeyBmbHVzaE5vdGlmaWNhdGlvbnNTb29uIH0gZnJvbSAnQC9saWIvbm90aWZpY2F0aW9ucy9vdXRib3gnO1xuaW1wb3J0IHsgZmx1c2hDYWxlbmRhclN5bmNTb29uIH0gZnJvbSAnQC9saWIvY2FsZW5kYXIvc3luYy5zZXJ2ZXInO1xuaW1wb3J0IHsgY2FuTWFuYWdlQ2FsZW5kYXIsIGNhbk92ZXJyaWRlU2xvdHMsIGNhblVzZUNhbGVuZGFyUGFnZSwgY2FuV29ya0NhbGVuZGFyLCB0eXBlIENhbGVuZGFyVmlld2VyIH0gZnJvbSAnQC9jb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcyc7XG5pbXBvcnQgdHlwZSB7IFB1YmxpY1Nsb3QgfSBmcm9tICdAL2NvbXBvbmVudHMvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IFByb2ZpbGUgfSBmcm9tICdAL2xpYi90eXBlcyc7XG5cbi8qKlxuICogSW4tYXBwIGNhbGVuZGFyIGFjdGlvbnMgKGFwcC9hcHAvY2FsZW5kYXIpOiBzbG90cyBmb3IgdGhlIHBpY2tlciwgYm9vayBhXG4gKiBjYWxsIG9uIHNvbWVvbmUncyBiZWhhbGYsIHJlc2NoZWR1bGUsIGNhbmNlbCwgaGVsZCAvIG5vLXNob3csIGFuZCB0aGVcbiAqIGJvb2tpbmctY2FsZW5kYXIgc2V0dGluZ3MuXG4gKlxuICogRXZlcnkgYWN0aW9uIGZpcnN0IHJlYWRzIHRoZSBjYWxlbmRhciAvIGJvb2tpbmcgLyBsZWFkIHRocm91Z2ggdGhlXG4gKiBzaWduZWQtaW4gdXNlcidzIE9XTiBjbGllbnQsIHNvIFJMUyAoMDA2OCkgZGVjaWRlcyB3aGV0aGVyIHRoZXkgbWF5IHNlZSBpdCxcbiAqIHRoZW4gYXBwbGllcyB0aGUgcm9sZSBydWxlcyBpbiBjb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcy50cyAoYSBjb250cmFjdG9yXG4gKiB3b3JrcyBvbmx5IGl0cyBvd24gY2FsZW5kYXIpLiBPbmx5IHRoZW4gZG9lcyB0aGUgc2VydmljZS1yb2xlIGJvb2tpbmcgUlBDXG4gKiBydW4sIHdoaWNoIHJlLWNoZWNrcyB0aGUgc2xvdCB1bmRlciB0aGUgY2FsZW5kYXIgbG9jay4gU3RhdHVzIGNoYW5nZXMgYW5kXG4gKiBzZXR0aW5ncyBzdGF5IG9uIHRoZSB1c2VyJ3MgY2xpZW50IChSTFMgd3JpdGUgcG9saWNpZXMgYXBwbHkgYXMgdGhleSBhcmUpLlxuICogSG9tZW93bmVyIC8gcHJvc3BlY3Qgbm90aWNlcyBnbyBvdXQgYWZ0ZXIgdGhlIHJlc3BvbnNlIChub3RpZnlCb29raW5nU29vbik7XG4gKiBwdXNoIGFuZCBHb29nbGUgc3luYyBjb21lIGZyb20gdGhlIERCIHRyaWdnZXJzIGFuZCBhcmUgZmx1c2hlZCBoZXJlLlxuICovXG5cbmV4cG9ydCB0eXBlIEFjdGlvblJlc3VsdDxUID0gb2JqZWN0PiA9ICh7IG9rOiB0cnVlIH0gJiBUKSB8IHsgb2s6IGZhbHNlOyBlcnJvcjogc3RyaW5nOyBwaWNrQW5vdGhlcj86IGJvb2xlYW4gfTtcbmV4cG9ydCB0eXBlIFNldHRpbmdzU3RhdGUgPSB7IGVycm9yPzogc3RyaW5nOyBzdWNjZXNzPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG5cbnR5cGUgRXZlbnRLaW5kSW5wdXQgPSAnYXBwb2ludG1lbnQnIHwgJ3Zpc2l0JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG5cbi8qKiBIb3N0LWZhY2luZyB3b3JkaW5nICh0aGUgaG9tZW93bmVyIG1lc3NhZ2VzIHNheSBcInlvdVwiOyBzdGFmZiBuZWVkIHRvIGtub3cgd2hhdCBoYXBwZW5lZCkuICovXG5jb25zdCBIT1NUX01FU1NBR0VTOiBQYXJ0aWFsPFJlY29yZDxCb29raW5nRXJyb3IsIHN0cmluZz4+ID0ge1xuICBhbHJlYWR5X2Jvb2tlZDogJ1RoaXMgbGVhZCBhbHJlYWR5IGhhcyBhIGNhbGwgYm9va2VkIGZyb20gdGhlIGZ1bm5lbC4nLFxuICBub3RfYm9va2FibGU6ICdUaGlzIGFwcG9pbnRtZW50IGlzIG5vdCBvbiBhIGJvb2tpbmcgY2FsZW5kYXIuIENoYW5nZSBpdCBmcm9tIHRoZSBsZWFkLicsXG4gIG5vdF9hY3RpdmU6ICdPbmx5IGEgc2NoZWR1bGVkIGNhbGwgY2FuIGJlIGNoYW5nZWQuJyxcbiAgbGVhZF9ub3RfZm91bmQ6ICdMZWFkIG5vdCBmb3VuZC4nLFxuICBhc3NpZ25tZW50X21pc21hdGNoOiAnVGhhdCBsZWFkIGlzIG5vdCBhc3NpZ25lZCB0byB0aGlzIGNvbnRyYWN0b3IuJyxcbiAgd3JvbmdfY2FsZW5kYXI6ICdUaGlzIGxlYWQgY2Fubm90IGJlIGJvb2tlZCBvbiB0aGF0IGNhbGVuZGFyLicsXG4gIGNhbGVuZGFyX2J1c3k6ICdBIGhvc3TigJlzIEdvb2dsZSBDYWxlbmRhciBpcyBidXN5IHRoZW4uIFBpY2sgYW5vdGhlciB0aW1lLicsXG59O1xuY29uc3QgbWVzc2FnZUZvciA9IChlOiBCb29raW5nRXJyb3IpID0+IEhPU1RfTUVTU0FHRVNbZV0gPz8gQk9PS0lOR19FUlJPUl9NRVNTQUdFU1tlXTtcbmNvbnN0IGZhaWxlZCA9IChlOiBCb29raW5nRXJyb3IpOiB7IG9rOiBmYWxzZTsgZXJyb3I6IHN0cmluZzsgcGlja0Fub3RoZXI/OiBib29sZWFuIH0gPT4gKHsgb2s6IGZhbHNlLCBlcnJvcjogbWVzc2FnZUZvcihlKSwgcGlja0Fub3RoZXI6IFBJQ0tfQU5PVEhFUl9USU1FLmhhcyhlKSB8fCB1bmRlZmluZWQgfSk7XG5jb25zdCBkZW5pZWQgPSB7IG9rOiBmYWxzZSBhcyBjb25zdCwgZXJyb3I6ICdZb3UgZG9u4oCZdCBoYXZlIGFjY2VzcyB0byB0aGlzIGNhbGVuZGFyLicgfTtcblxuY29uc3QgdXVpZCA9IHouc3RyaW5nKCkudXVpZCgpO1xuY29uc3QgaXNvID0gei5zdHJpbmcoKS5yZWZpbmUoKHYpID0+IE51bWJlci5pc0Zpbml0ZShEYXRlLnBhcnNlKHYpKSwgJ1BpY2sgYSB2YWxpZCB0aW1lJyk7XG5cbmludGVyZmFjZSBDdHgge1xuICBwcm9maWxlOiBQcm9maWxlO1xuICB2aWV3ZXI6IENhbGVuZGFyVmlld2VyO1xuICB1c2VyRGI6IGFueTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29udGV4dCgpOiBQcm9taXNlPEN0eCB8IG51bGw+IHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGNvbnN0IHZpZXdlcjogQ2FsZW5kYXJWaWV3ZXIgPSB7IGlkOiBwcm9maWxlLmlkLCByb2xlOiBwcm9maWxlLnJvbGUsIGNvbnRyYWN0b3JfaWQ6IHByb2ZpbGUuY29udHJhY3Rvcl9pZCwgY29udHJhY3Rvcl9yb2xlOiBwcm9maWxlLmNvbnRyYWN0b3Jfcm9sZSB9O1xuICBpZiAoIWNhblVzZUNhbGVuZGFyUGFnZSh2aWV3ZXIpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgcHJvZmlsZSwgdmlld2VyLCB1c2VyRGI6IGF3YWl0IGNyZWF0ZUNsaWVudCgpIH07XG59XG5cbi8qKiBUaGUgY2FsZW5kYXIsIHJlYWQgdGhyb3VnaCB0aGUgdXNlcidzIGNsaWVudCAoUkxTKSwgb3IgbnVsbC4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZpc2libGVDYWxlbmRhcih1c2VyRGI6IGFueSwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ0NhbGVuZGFyIHwgbnVsbD4ge1xuICBpZiAoIXV1aWQuc2FmZVBhcnNlKGlkKS5zdWNjZXNzKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCB1c2VyRGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcnMnKS5zZWxlY3QoJyonKS5lcSgnaWQnLCBpZCkubWF5YmVTaW5nbGUoKTtcbiAgcmV0dXJuIGRhdGEgPyBtYXBDYWxlbmRhcihkYXRhKSA6IG51bGw7XG59XG5cbmludGVyZmFjZSBCb29raW5nUmVmIHtcbiAga2luZDogJ2FwcG9pbnRtZW50JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG4gIGlkOiBzdHJpbmc7XG4gIGNhbGVuZGFyOiBCb29raW5nQ2FsZW5kYXIgfCBudWxsO1xuICAvKiogQ29udHJhY3RvciB0aGF0IG93bnMgYSB2aXNpdCAobm8gY2FsZW5kYXIpIHRocm91Z2ggaXRzIGFzc2lnbm1lbnQuICovXG4gIHZpc2l0Q29udHJhY3RvcklkOiBzdHJpbmcgfCBudWxsO1xuICBsZWFkSWQ6IHN0cmluZyB8IG51bGw7XG4gIHNjaGVkdWxlZEF0OiBzdHJpbmcgfCBudWxsO1xuICBzdGF0dXM6IHN0cmluZztcbn1cblxuLyoqIEEgYm9va2luZyB0aGUgdXNlciBjYW4gc2VlIChSTFMpICsgd2hldGhlciB0aGUgcm9sZSBydWxlcyBsZXQgdGhlbSB3b3JrIGl0LiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya2FibGVCb29raW5nKGN0eDogQ3R4LCBraW5kOiBFdmVudEtpbmRJbnB1dCwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ1JlZiB8IG51bGw+IHtcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZShpZCkuc3VjY2VzcykgcmV0dXJuIG51bGw7XG4gIGlmIChraW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ3Byb3NwZWN0X3NhbGVzX2FwcG9pbnRtZW50cycpLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cycpLmVxKCdpZCcsIGlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gICAgLy8gU2FsZXMgbWVldGluZ3MgYXJlIEhvbWVRdW90ZSdzIG93bjogbmV2ZXIgYSBjb250cmFjdG9yJ3MuXG4gICAgaWYgKGN0eC52aWV3ZXIucm9sZSAhPT0gJ2FkbWluJyAmJiBjdHgudmlld2VyLnJvbGUgIT09ICdzZXR0ZXInKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjYWxlbmRhciA9IGRhdGEuY2FsZW5kYXJfaWQgPyBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgZGF0YS5jYWxlbmRhcl9pZCkgOiBudWxsO1xuICAgIHJldHVybiB7IGtpbmQsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IG51bGwsIGxlYWRJZDogbnVsbCwgc2NoZWR1bGVkQXQ6IGRhdGEuc2NoZWR1bGVkX2F0LCBzdGF0dXM6IGRhdGEuc3RhdHVzIH07XG4gIH1cbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiXG4gICAgLmZyb20oJ2FwcG9pbnRtZW50cycpXG4gICAgLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBsZWFkX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cywgYXNzaWdubWVudDpsZWFkX2Fzc2lnbm1lbnRzKGNvbnRyYWN0b3JfaWQsIGxlYWRfaWQpJylcbiAgICAuZXEoJ2lkJywgaWQpXG4gICAgLm1heWJlU2luZ2xlKCk7XG4gIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGFzZyA9IEFycmF5LmlzQXJyYXkoZGF0YS5hc3NpZ25tZW50KSA/IGRhdGEuYXNzaWdubWVudFswXSA6IGRhdGEuYXNzaWdubWVudDtcbiAgY29uc3QgY2FsZW5kYXIgPSBkYXRhLmNhbGVuZGFyX2lkID8gYXdhaXQgdmlzaWJsZUNhbGVuZGFyKGN0eC51c2VyRGIsIGRhdGEuY2FsZW5kYXJfaWQpIDogbnVsbDtcbiAgY29uc3QgcmVmOiBCb29raW5nUmVmID0ge1xuICAgIGtpbmQ6ICdhcHBvaW50bWVudCcsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IGRhdGEuY2FsZW5kYXJfaWQgPyBudWxsIDogYXNnPy5jb250cmFjdG9yX2lkID8/IG51bGwsXG4gICAgbGVhZElkOiBkYXRhLmxlYWRfaWQgPz8gYXNnPy5sZWFkX2lkID8/IG51bGwsIHNjaGVkdWxlZEF0OiBkYXRhLnNjaGVkdWxlZF9hdCwgc3RhdHVzOiBkYXRhLnN0YXR1cyxcbiAgfTtcbiAgaWYgKGNhbGVuZGFyKSByZXR1cm4gY2FuV29ya0NhbGVuZGFyKGN0eC52aWV3ZXIsIGNhbGVuZGFyKSA/IHJlZiA6IG51bGw7XG4gIC8vIEEgdmlzaXQgd2l0aCBubyBjYWxlbmRhcjogc3RhZmYsIG9yIHRoZSBjb250cmFjdG9yIHdob3NlIGFzc2lnbm1lbnQgaXQgaXMuXG4gIGNvbnN0IHN0YWZmID0gY3R4LnZpZXdlci5yb2xlID09PSAnYWRtaW4nIHx8IGN0eC52aWV3ZXIucm9sZSA9PT0gJ3NldHRlcic7XG4gIHJldHVybiBzdGFmZiB8fCAocmVmLnZpc2l0Q29udHJhY3RvcklkICE9PSBudWxsICYmIHJlZi52aXNpdENvbnRyYWN0b3JJZCA9PT0gY3R4LnZpZXdlci5jb250cmFjdG9yX2lkKSA/IHJlZiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGVuZGFyJyk7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2FwcG9pbnRtZW50cycpO1xuICBpZiAobGVhZElkKSB7XG4gICAgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvbGVhZHMnKTtcbiAgICByZXZhbGlkYXRlUGF0aChgL2FwcC9sZWFkcy8ke2xlYWRJZH1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlckNoYW5nZShsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGZsdXNoTm90aWZpY2F0aW9uc1Nvb24oKTtcbiAgZmx1c2hDYWxlbmRhclN5bmNTb29uKCk7XG4gIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhdWRpdE92ZXJyaWRlKGFjdG9ySWQ6IHN0cmluZywgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIC8vIFNlcnZpY2Ugcm9sZTogYXVkaXRfbG9ncyBpcyBpbnNlcnQtcmVzdHJpY3RlZCB0byBhZG1pbnMgYnkgUkxTLCBidXQgc2V0dGVycyBtYXkgb3ZlcnJpZGUgdG9vIChhcyBvbiB0aGUgbGVhZCBwYWdlKS5cbiAgYXdhaXQgY3JlYXRlQWRtaW5DbGllbnQoKS5mcm9tKCdhdWRpdF9sb2dzJykuaW5zZXJ0KHsgYWN0b3JfaWQ6IGFjdG9ySWQsIGFjdGlvbjogJ2FwcG9pbnRtZW50LmF2YWlsYWJpbGl0eV9vdmVycmlkZScsIHRhcmdldF91c2VyX2lkOiBudWxsLCBtZXRhZGF0YSB9KTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBTbG90cyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTbG90c1BheWxvYWQge1xuICBzbG90czogUHVibGljU2xvdFtdO1xuICB0aW1lWm9uZTogc3RyaW5nO1xuICBkdXJhdGlvbk1pbnV0ZXM6IG51bWJlcjtcbiAgLyoqIFRoZSBib29raW5nJ3MgY3VycmVudCBzdGFydCAocmVzY2hlZHVsaW5nKS4gKi9cbiAgY3VycmVudDogc3RyaW5nIHwgbnVsbDtcbn1cblxuLyoqIE9wZW4gdGltZXMgb24gYSBjYWxlbmRhciBmb3IgdGhlIHBpY2tlcjsgd2l0aCBgcmVzY2hlZHVsZWAsIHRoYXQgYm9va2luZydzIG93biB0aW1lIGRvZXMgbm90IGJsb2NrLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENhbGVuZGFyU2xvdHMoaW5wdXQ6IHsgY2FsZW5kYXJJZDogc3RyaW5nOyByZXNjaGVkdWxlPzogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZyB9IH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdDxTbG90c1BheWxvYWQ+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBpbnB1dC5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICBsZXQgY3VycmVudDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIGxldCBleGNsdWRlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGlucHV0LnJlc2NoZWR1bGUpIHtcbiAgICBjb25zdCByZWYgPSBhd2FpdCB3b3JrYWJsZUJvb2tpbmcoY3R4LCBpbnB1dC5yZXNjaGVkdWxlLmtpbmQsIGlucHV0LnJlc2NoZWR1bGUuaWQpO1xuICAgIGlmICghcmVmIHx8IHJlZi5jYWxlbmRhcj8uaWQgIT09IGNhbC5pZCkgcmV0dXJuIGRlbmllZDtcbiAgICBjdXJyZW50ID0gcmVmLnNjaGVkdWxlZEF0ID8gbmV3IERhdGUocmVmLnNjaGVkdWxlZEF0KS50b0lTT1N0cmluZygpIDogbnVsbDtcbiAgICBleGNsdWRlSWQgPSByZWYuaWQ7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCByID0gYXdhaXQgZ2V0U2xvdHMoY2FsLmlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBleGNsdWRlSWQgfSk7XG4gICAgaWYgKCFyKSByZXR1cm4gZGVuaWVkO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHNsb3RzOiByLnNsb3RzLm1hcCgocykgPT4gKHsgc3RhcnQ6IG5ldyBEYXRlKHMuc3RhcnRNcykudG9JU09TdHJpbmcoKSwgZW5kOiBuZXcgRGF0ZShzLmVuZE1zKS50b0lTT1N0cmluZygpIH0pKSxcbiAgICAgIHRpbWVab25lOiByLmNhbGVuZGFyLnRpbWV6b25lLFxuICAgICAgZHVyYXRpb25NaW51dGVzOiByLmNhbGVuZGFyLmR1cmF0aW9uTWludXRlcyxcbiAgICAgIGN1cnJlbnQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhaWxlZCgndW5hdmFpbGFibGUnKTtcbiAgfVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qIFdobyBjYW4gYmUgYm9va2VkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvb2thYmxlUGFydHkge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nIHwgbnVsbDtcbiAgcGhvbmU6IHN0cmluZyB8IG51bGw7XG59XG5cbmNvbnN0IHNlYXJjaElucHV0ID0gei5vYmplY3QoeyBjYWxlbmRhcklkOiB1dWlkLCBxdWVyeTogei5zdHJpbmcoKS50cmltKCkubWF4KDgwKSB9KTtcblxuLyoqXG4gKiBMZWFkcyAoaG9tZW93bmVyIGNhbGVuZGFycykgb3IgY29udHJhY3RvciBwcm9zcGVjdHMgKHNhbGVzIGNhbGVuZGFyKSB0aGVcbiAqIHVzZXIgbWF5IGJvb2ssIG1hdGNoaW5nIGEgbmFtZSAvIHBob25lIC8gZW1haWwuIFJMUyBzY29wZXMgdGhlIHNlYXJjaDpcbiAqIHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdCwgYSBzZXR0ZXJcbiAqIG9ubHkgcHJvc3BlY3RzIGFzc2lnbmVkIHRvIHRoZW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWFyY2hCb29rYWJsZShjYWxlbmRhcklkOiBzdHJpbmcsIHF1ZXJ5OiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvblJlc3VsdDx7IHJlc3VsdHM6IEJvb2thYmxlUGFydHlbXSB9Pj4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBzZWFyY2hJbnB1dC5zYWZlUGFyc2UoeyBjYWxlbmRhcklkLCBxdWVyeSB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IHRydWUsIHJlc3VsdHM6IFtdIH07XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBwYXJzZWQuZGF0YS5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICAvLyBQb3N0Z1JFU1Qgb3ItZmlsdGVyOiBzdHJpcCB0aGUgY2hhcmFjdGVycyB0aGF0IHdvdWxkIGNoYW5nZSBpdHMgbWVhbmluZy5cbiAgY29uc3QgcSA9IHBhcnNlZC5kYXRhLnF1ZXJ5LnJlcGxhY2UoL1ssKCkqJVxcXFxdL2csICcgJykudHJpbSgpO1xuICBjb25zdCBkaWdpdHMgPSBxLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgbGV0IHJlcSA9IGN0eC51c2VyRGIuZnJvbSgnY29udHJhY3Rvcl9wcm9zcGVjdHMnKS5zZWxlY3QoJ2lkLCBjb21wYW55X25hbWUsIGRlY2lzaW9uX21ha2VyX25hbWUsIHBob25lLCBjaXR5Jykub3JkZXIoJ3VwZGF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICAgIGlmIChxKSByZXEgPSByZXEub3IoW2Bjb21wYW55X25hbWUuaWxpa2UuKiR7cX0qYCwgYGRlY2lzaW9uX21ha2VyX25hbWUuaWxpa2UuKiR7cX0qYCwgLi4uKGRpZ2l0cy5sZW5ndGggPj0gMyA/IFtgcGhvbmVfZTE2NC5pbGlrZS4qJHtkaWdpdHN9KmBdIDogW10pXS5qb2luKCcsJykpO1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHJlc3VsdHM6ICgoZGF0YSA/PyBbXSkgYXMgYW55W10pLm1hcCgocCkgPT4gKHtcbiAgICAgICAgaWQ6IHAuaWQsIG5hbWU6IHAuZGVjaXNpb25fbWFrZXJfbmFtZSA/IGAke3AuZGVjaXNpb25fbWFrZXJfbmFtZX0gwrcgJHtwLmNvbXBhbnlfbmFtZX1gIDogcC5jb21wYW55X25hbWUsIGRldGFpbDogcC5jaXR5ID8/IG51bGwsIHBob25lOiBwLnBob25lID8/IG51bGwsXG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIGxldCByZXEgPSBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwaG9uZSwgZW1haWwsIGNpdHksIHZlcnRpY2FsX2lkJykub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICBpZiAoY2FsLmtpbmQgPT09ICdjb250cmFjdG9yJykge1xuICAgIC8vIE9ubHkgbGVhZHMgYXNzaWduZWQgdG8gdGhpcyBjYWxlbmRhcidzIGNvbnRyYWN0b3IgY2FuIGdvIG9uIGl0ICh0aGUgUlBDIGxpbmtzIHRoZSBhc3NpZ25tZW50KS5cbiAgICBjb25zdCB7IGRhdGE6IGFzZyB9ID0gYXdhaXQgY3R4LnVzZXJEYlxuICAgICAgLmZyb20oJ2xlYWRfYXNzaWdubWVudHMnKVxuICAgICAgLnNlbGVjdCgnbGVhZF9pZCcpXG4gICAgICAuZXEoJ2NvbnRyYWN0b3JfaWQnLCBjYWwuY29udHJhY3RvcklkKVxuICAgICAgLm9yZGVyKCdhc3NpZ25lZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLy8gVGhlIG5ld2VzdCAzMDAga2VlcCB0aGUgaWQgbGlzdCB3ZWxsIGluc2lkZSBhIFVSTDsgb2xkZXIgbGVhZHMgYXJlIHJhcmVseSBib29rZWQgZnJvbSBoZXJlLlxuICAgICAgLmxpbWl0KDMwMCk7XG4gICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQoKChhc2cgPz8gW10pIGFzIGFueVtdKS5tYXAoKGEpID0+IGEubGVhZF9pZCBhcyBzdHJpbmcpKV07XG4gICAgaWYgKCFpZHMubGVuZ3RoKSByZXR1cm4geyBvazogdHJ1ZSwgcmVzdWx0czogW10gfTtcbiAgICByZXEgPSByZXEuaW4oJ2lkJywgaWRzKTtcbiAgfVxuICBpZiAocSkge1xuICAgIGNvbnN0IHdvcmRzID0gcS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5zbGljZSgwLCAyKTtcbiAgICBjb25zdCBvcnMgPSBbXG4gICAgICAuLi53b3Jkcy5mbGF0TWFwKCh3KSA9PiBbYGZpcnN0X25hbWUuaWxpa2UuKiR7d30qYCwgYGxhc3RfbmFtZS5pbGlrZS4qJHt3fSpgXSksXG4gICAgICBgZW1haWwuaWxpa2UuKiR7cX0qYCxcbiAgICAgIC4uLihkaWdpdHMubGVuZ3RoID49IDMgPyBbYHBob25lLmlsaWtlLioke2RpZ2l0cy5zbGljZSgtNyl9KmBdIDogW10pLFxuICAgIF07XG4gICAgcmVxID0gcmVxLm9yKG9ycy5qb2luKCcsJykpO1xuICB9XG4gIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICBjb25zdCBsZWFkcyA9IChkYXRhID8/IFtdKSBhcyBhbnlbXTtcbiAgY29uc3QgdmVydGljYWxJZHMgPSBbLi4ubmV3IFNldChsZWFkcy5tYXAoKGwpID0+IGwudmVydGljYWxfaWQpLmZpbHRlcihCb29sZWFuKSldO1xuICBjb25zdCB7IGRhdGE6IHZlcnRpY2FscyB9ID0gdmVydGljYWxJZHMubGVuZ3RoID8gYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCd2ZXJ0aWNhbHMnKS5zZWxlY3QoJ2lkLCBuYW1lJykuaW4oJ2lkJywgdmVydGljYWxJZHMpIDogeyBkYXRhOiBbXSB9O1xuICBjb25zdCB2ZXJ0aWNhbCA9IG5ldyBNYXAoKCh2ZXJ0aWNhbHMgPz8gW10pIGFzIGFueVtdKS5tYXAoKHYpID0+IFt2LmlkIGFzIHN0cmluZywgdi5uYW1lIGFzIHN0cmluZ10pKTtcbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByZXN1bHRzOiBsZWFkcy5tYXAoKGwpID0+ICh7XG4gICAgICBpZDogbC5pZCxcbiAgICAgIG5hbWU6IFtsLmZpcnN0X25hbWUsIGwubGFzdF9uYW1lXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpIHx8IGwucGhvbmUgfHwgbC5lbWFpbCB8fCAnTGVhZCcsXG4gICAgICBkZXRhaWw6IFt2ZXJ0aWNhbC5nZXQobC52ZXJ0aWNhbF9pZCksIGwuY2l0eV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyDCtyAnKSB8fCBudWxsLFxuICAgICAgcGhvbmU6IGwucGhvbmUgPz8gbnVsbCxcbiAgICB9KSksXG4gIH07XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogQm9vayAvIHJlc2NoZWR1bGUgLyBjYW5jZWwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGJvb2tJbnB1dCA9IHoub2JqZWN0KHtcbiAgY2FsZW5kYXJJZDogdXVpZCxcbiAgcGFydHlJZDogdXVpZCxcbiAgc3RhcnRzQXQ6IGlzbyxcbiAgbm90ZXM6IHouc3RyaW5nKCkudHJpbSgpLm1heCgyMDAwKS5vcHRpb25hbCgpLFxuICBvdmVycmlkZTogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogQm9vayBhIGNhbGwgb24gc29tZW9uZSdzIGJlaGFsZjogYSBsZWFkIG9uIGEgaG9tZW93bmVyIGNhbGVuZGFyLCBhIHByb3NwZWN0IG9uIHRoZSBzYWxlcyBjYWxlbmRhci4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBib29rQ2FsbE9uQmVoYWxmKGlucHV0OiB6LmlucHV0PHR5cGVvZiBib29rSW5wdXQ+KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBpZDogc3RyaW5nOyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGJvb2tJbnB1dC5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgYm9va2luZycgfTtcbiAgY29uc3QgeyBjYWxlbmRhcklkLCBwYXJ0eUlkLCBzdGFydHNBdCwgbm90ZXMgfSA9IHBhcnNlZC5kYXRhO1xuICBjb25zdCBjYWwgPSBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgY2FsZW5kYXJJZCk7XG4gIGlmICghY2FsIHx8ICFjYW5Xb3JrQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsKSkgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFjYWwuYWN0aXZlKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnVGhpcyBjYWxlbmRhciBpcyBzd2l0Y2hlZCBvZmYuIFR1cm4gaXQgb24gaW4gaXRzIHNldHRpbmdzIGZpcnN0LicgfTtcbiAgY29uc3Qgb3ZlcnJpZGUgPSAhIXBhcnNlZC5kYXRhLm92ZXJyaWRlICYmIGNhbk92ZXJyaWRlU2xvdHMoY3R4LnZpZXdlcik7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgLy8gUkxTOiBhZG1pbnMgc2VlIGV2ZXJ5IHByb3NwZWN0LCBhIHNldHRlciBvbmx5IHRob3NlIGFzc2lnbmVkIHRvIHRoZW0uXG4gICAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2NvbnRyYWN0b3JfcHJvc3BlY3RzJykuc2VsZWN0KCdpZCwgY29tcGFueV9uYW1lLCBkZWNpc2lvbl9tYWtlcl9uYW1lLCBwaG9uZSwgZW1haWwnKS5lcSgnaWQnLCBwYXJ0eUlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghcCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ1Byb3NwZWN0IG5vdCBmb3VuZC4nIH07XG4gICAgY29uc3QgciA9IGF3YWl0IGJvb2tTYWxlc0FwcG9pbnRtZW50KHtcbiAgICAgIGNhbGVuZGFySWQ6IGNhbC5pZCwgc3RhcnRzQXQsIHByb3NwZWN0SWQ6IHAuaWQsXG4gICAgICAvLyBUaGUgcGVyc29uIGJvb2tpbmcgaXMgY3JlZGl0ZWQsIGFzIGluIHRoZSBjYWxsaW5nIHdvcmtzcGFjZSAoc2V0dGVyIHBheSwgMDA2MikuXG4gICAgICBwYXJ0bmVySWQ6IGN0eC5wcm9maWxlLmlkLCBzb3VyY2U6ICdtYW51YWwnLFxuICAgICAgY29udGFjdDogeyBuYW1lOiBwLmRlY2lzaW9uX21ha2VyX25hbWUgPz8gdW5kZWZpbmVkLCBwaG9uZTogcC5waG9uZSA/PyB1bmRlZmluZWQsIGVtYWlsOiBwLmVtYWlsID8/IHVuZGVmaW5lZCB9LFxuICAgICAgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgICB9KTtcbiAgICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IHNhbGVzX2FwcG9pbnRtZW50X2lkOiByLnNhbGVzQXBwb2ludG1lbnRJZCwgY2FsZW5kYXJfaWQ6IGNhbC5pZCwgc2NoZWR1bGVkX2F0OiByLnN0YXJ0c0F0IH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogJ3NhbGVzX2FwcG9pbnRtZW50JywgaWQ6IHIuc2FsZXNBcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgICBhZnRlckNoYW5nZSgpO1xuICAgIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGxzL2FwcG9pbnRtZW50cycpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5zYWxlc0FwcG9pbnRtZW50SWQsIHN0YXJ0c0F0OiByLnN0YXJ0c0F0IH07XG4gIH1cblxuICAvLyBSTFM6IHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdC5cbiAgY29uc3QgeyBkYXRhOiBsZWFkIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCcpLmVxKCdpZCcsIHBhcnR5SWQpLm1heWJlU2luZ2xlKCk7XG4gIGlmICghbGVhZCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0xlYWQgbm90IGZvdW5kLicgfTtcbiAgY29uc3QgciA9IGF3YWl0IGJvb2tBcHBvaW50bWVudCh7XG4gICAgY2FsZW5kYXJJZDogY2FsLmlkLCBzdGFydHNBdCwgbGVhZElkOiBsZWFkLmlkLCBzb3VyY2U6ICdtYW51YWwnLCBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgfSk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IGFwcG9pbnRtZW50X2lkOiByLmFwcG9pbnRtZW50SWQsIGNhbGVuZGFyX2lkOiBjYWwuaWQsIHNjaGVkdWxlZF9hdDogci5zdGFydHNBdCB9KTtcbiAgbm90aWZ5Qm9va2luZ1Nvb24oeyBraW5kOiAnYXBwb2ludG1lbnQnLCBpZDogci5hcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UobGVhZC5pZCk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5hcHBvaW50bWVudElkLCBzdGFydHNBdDogci5zdGFydHNBdCB9O1xufVxuXG5jb25zdCBjaGFuZ2VJbnB1dCA9IHoub2JqZWN0KHsga2luZDogei5lbnVtKFsnYXBwb2ludG1lbnQnLCAndmlzaXQnLCAnc2FsZXNfYXBwb2ludG1lbnQnXSksIGlkOiB1dWlkIH0pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzY2hlZHVsZUNhbGVuZGFyRXZlbnQoaW5wdXQ6IHsga2luZDogRXZlbnRLaW5kSW5wdXQ7IGlkOiBzdHJpbmc7IHN0YXJ0c0F0OiBzdHJpbmc7IG92ZXJyaWRlPzogYm9vbGVhbiB9KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXJ0c0F0OiBpc28sIG92ZXJyaWRlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpIH0pLnNhZmVQYXJzZShpbnB1dCk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgdmFsaWQgdGltZScgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFyZWYuY2FsZW5kYXIpIHJldHVybiBmYWlsZWQoJ25vdF9ib29rYWJsZScpO1xuICBjb25zdCBvdmVycmlkZSA9ICEhcGFyc2VkLmRhdGEub3ZlcnJpZGUgJiYgY2FuT3ZlcnJpZGVTbG90cyhjdHgudmlld2VyKTtcbiAgY29uc3Qgb3B0cyA9IHsgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIGFjdG9yS2luZDogJ3VzZXInIGFzIGNvbnN0LCBvdmVycmlkZSB9O1xuICBjb25zdCByID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCdcbiAgICA/IGF3YWl0IHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcGFyc2VkLmRhdGEuc3RhcnRzQXQsIG9wdHMpXG4gICAgOiBhd2FpdCByZXNjaGVkdWxlQXBwb2ludG1lbnQocmVmLmlkLCBwYXJzZWQuZGF0YS5zdGFydHNBdCwgb3B0cyk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgY29uc3Qgc3RhcnRzQXQgPSByLnN0YXJ0c0F0ID8/IG5ldyBEYXRlKHBhcnNlZC5kYXRhLnN0YXJ0c0F0KS50b0lTT1N0cmluZygpO1xuICBpZiAoIXIudW5jaGFuZ2VkKSB7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IFtgJHtyZWYua2luZH1faWRgXTogcmVmLmlkLCBjYWxlbmRhcl9pZDogcmVmLmNhbGVuZGFyLmlkLCBzY2hlZHVsZWRfYXQ6IHN0YXJ0c0F0LCByZXNjaGVkdWxlOiB0cnVlIH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogcmVmLmtpbmQsIGlkOiByZWYuaWQsIGNoYW5nZTogJ3Jlc2NoZWR1bGVkJywgcHJldmlvdXNTdGFydHNBdDogci5wcmV2aW91c1N0YXJ0c0F0ID8/IHJlZi5zY2hlZHVsZWRBdCwgYWN0b3JLaW5kOiAndXNlcicgfSk7XG4gIH1cbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBzdGFydHNBdCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FuY2VsQ2FsZW5kYXJFdmVudChpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBjaGFuZ2VJbnB1dC5leHRlbmQoeyByZWFzb246IHouc3RyaW5nKCkudHJpbSgpLm1heCg1MDApLm9wdGlvbmFsKCkgfSkuc2FmZVBhcnNlKGlucHV0KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0NoZWNrIHRoZSBjYW5jZWxsYXRpb24nIH07XG4gIGNvbnN0IHJlZiA9IGF3YWl0IHdvcmthYmxlQm9va2luZyhjdHgsIHBhcnNlZC5kYXRhLmtpbmQsIHBhcnNlZC5kYXRhLmlkKTtcbiAgaWYgKCFyZWYpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHJlYXNvbiA9IHBhcnNlZC5kYXRhLnJlYXNvbiB8fCBudWxsO1xuICBjb25zdCBvcHRzID0geyBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicgYXMgY29uc3QgfTtcbiAgY29uc3QgciA9IHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnXG4gICAgPyBhd2FpdCBjYW5jZWxTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcmVhc29uLCBvcHRzKVxuICAgIDogYXdhaXQgY2FuY2VsQXBwb2ludG1lbnQocmVmLmlkLCByZWFzb24sIG9wdHMpO1xuICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gIC8vIENhbGVuZGFyIGJvb2tpbmdzIHRlbGwgdGhlIGhvbWVvd25lciAvIHByb3NwZWN0OyBhbiBvbi1zaXRlIHZpc2l0J3Mgbm90aWNlcyBzdGF5IHdpdGggaXRzIHdvcmtmbG93cy5cbiAgaWYgKCFyLmFscmVhZHkgJiYgcmVmLmNhbGVuZGFyKSBub3RpZnlCb29raW5nU29vbih7IGtpbmQ6IHJlZi5raW5kLCBpZDogcmVmLmlkLCBjaGFuZ2U6ICdjYW5jZWxsZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlIH07XG59XG5cbmNvbnN0IFNUQVRVU19GT1I6IFJlY29yZDwnYXBwb2ludG1lbnQnIHwgJ3NhbGVzX2FwcG9pbnRtZW50Jywgc3RyaW5nW10+ID0ge1xuICBhcHBvaW50bWVudDogWydoZWxkJywgJ25vX3Nob3cnLCAnc2NoZWR1bGVkJ10sXG4gIHNhbGVzX2FwcG9pbnRtZW50OiBbJ2NvbXBsZXRlZCcsICdub19zaG93JywgJ3NjaGVkdWxlZCddLFxufTtcblxuLyoqIEhlbGQgLyBuby1zaG93IChhbmQgYmFjayB0byBzY2hlZHVsZWQgdG8gdW5kbykuIENhbmNlbGxpbmcgZ29lcyB0aHJvdWdoIGNhbmNlbENhbGVuZGFyRXZlbnQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q2FsZW5kYXJFdmVudFN0YXR1cyhpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgc3RhdHVzOiBzdHJpbmcgfSk6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXR1czogei5zdHJpbmcoKSB9KS5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnUGljayBhIHN0YXR1cycgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgY29uc3Qgc3RhdHVzID0gcGFyc2VkLmRhdGEuc3RhdHVzO1xuICBpZiAoIVNUQVRVU19GT1JbcmVmLmtpbmRdLmluY2x1ZGVzKHN0YXR1cykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgc3RhdHVzJyB9O1xuICBpZiAocmVmLnN0YXR1cyA9PT0gJ2NhbmNlbGxlZCcpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdBIGNhbmNlbGxlZCBjYWxsIGNhbm5vdCBiZSBtYXJrZWQuIEJvb2sgYSBuZXcgb25lIGluc3RlYWQuJyB9O1xuXG4gIC8vIFRoZSB1c2VyJ3Mgb3duIGNsaWVudDogdGhlIGV4aXN0aW5nIFJMUyB3cml0ZSBydWxlcyBkZWNpZGUgKGUuZy4gYSBzZXR0ZXIgZWRpdHMgb25seSBzYWxlcyBtZWV0aW5ncyB0aGV5IGJvb2tlZCkuXG4gIGNvbnN0IHRhYmxlID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCcgPyAncHJvc3BlY3Rfc2FsZXNfYXBwb2ludG1lbnRzJyA6ICdhcHBvaW50bWVudHMnO1xuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20odGFibGUpLnVwZGF0ZSh7IHN0YXR1cyB9KS5lcSgnaWQnLCByZWYuaWQpLnNlbGVjdCgnaWQnKTtcbiAgaWYgKGVycm9yIHx8ICEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiByZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JyA/ICdPbmx5IGFuIGFkbWluIG9yIHRoZSBzZXR0ZXIgd2hvIGJvb2tlZCB0aGlzIG1lZXRpbmcgY2FuIGNoYW5nZSBpdC4nIDogJ1RoaXMgYXBwb2ludG1lbnQgY291bGQgbm90IGJlIHVwZGF0ZWQuJyB9O1xuICB9XG5cbiAgaWYgKHJlZi5raW5kID09PSAnYXBwb2ludG1lbnQnICYmIHJlZi5sZWFkSWQgJiYgc3RhdHVzID09PSAnaGVsZCcpIHtcbiAgICAvLyBBIGhlbGQgY2FsbCB3aXRoIHRoZSBIb21lUXVvdGUgdGVhbSBpcyBub3QgdGhlIGNvbnRyYWN0b3IgYXBwb2ludG1lbnQ6IHRoZSBsZWFkJ3Mgc3RhZ2Ugc3RheXMgd2hlcmUgaXQgaXMuXG4gICAgY29uc3QgdGVhbUNhbGwgPSByZWYuY2FsZW5kYXI/LmtpbmQgPT09ICd0ZWFtJztcbiAgICBpZiAoIXRlYW1DYWxsKSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykudXBkYXRlKHsgc3RhdHVzOiAnYXBwb2ludG1lbnRfY29tcGxldGVkJyB9KS5lcSgnaWQnLCByZWYubGVhZElkKTtcbiAgICBjb25zdCBjb250cmFjdG9ySWQgPSByZWYuY2FsZW5kYXI/LmNvbnRyYWN0b3JJZCA/PyByZWYudmlzaXRDb250cmFjdG9ySWQ7XG4gICAgYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCdsZWFkX2FjdGl2aXRpZXMnKS5pbnNlcnQoe1xuICAgICAgbGVhZF9pZDogcmVmLmxlYWRJZCwgYWN0b3JfaWQ6IGN0eC5wcm9maWxlLmlkLCB0eXBlOiAnYXBwb2ludG1lbnQnLCBib2R5OiB0ZWFtQ2FsbCA/ICdDYWxsIHdpdGggdGhlIEhvbWVRdW90ZSB0ZWFtIGhlbGQnIDogJ0FwcG9pbnRtZW50IGNvbXBsZXRlZCcsXG4gICAgICAvLyBDb250cmFjdG9yLWF1dGhvcmVkIGVudHJpZXMgbXVzdCBuYW1lIHRoZWlyIG93biBjb21wYW55IChhY3Rpdml0aWVzX2luc2VydCBSTFMpLlxuICAgICAgbWV0YWRhdGE6IHsgYXBwb2ludG1lbnRfaWQ6IHJlZi5pZCwgLi4uKGNvbnRyYWN0b3JJZCA/IHsgY29udHJhY3Rvcl9pZDogY29udHJhY3RvcklkIH0gOiB7fSkgfSxcbiAgICB9KTtcbiAgfVxuICBhZnRlckNoYW5nZShyZWYubGVhZElkKTtcbiAgaWYgKHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSByZXZhbGlkYXRlUGF0aCgnL2FwcC9jYWxscy9hcHBvaW50bWVudHMnKTtcbiAgcmV0dXJuIHsgb2s6IHRydWUgfTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBDYWxlbmRhciBzZXR0aW5ncyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQ6IHN0cmluZyk6IFByb21pc2U8eyBjdHg6IEN0eDsgY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciB9IHwgeyBlcnJvcjogc3RyaW5nIH0+IHtcbiAgY29uc3QgY3R4ID0gYXdhaXQgY29udGV4dCgpO1xuICBpZiAoIWN0eCkgcmV0dXJuIHsgZXJyb3I6IGRlbmllZC5lcnJvciB9O1xuICBjb25zdCBjYWxlbmRhciA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBjYWxlbmRhcklkKTtcbiAgaWYgKCFjYWxlbmRhcikgcmV0dXJuIHsgZXJyb3I6ICdDYWxlbmRhciBub3QgZm91bmQnIH07XG4gIGlmICghY2FuTWFuYWdlQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsZW5kYXIpKSByZXR1cm4geyBlcnJvcjogJ09ubHkgYSBIb21lUXVvdGUgYWRtaW4gb3IgdGhlIGNvbXBhbnkgb3duZXIgY2FuIGNoYW5nZSB0aGlzIGNhbGVuZGFyLicgfTtcbiAgcmV0dXJuIHsgY3R4LCBjYWxlbmRhciB9O1xufVxuXG5jb25zdCBmaWVsZCA9IChmOiBGb3JtRGF0YSwgazogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHYgPSBmLmdldChrKTtcbiAgcmV0dXJuIHYgPT09IG51bGwgPyBudWxsIDogU3RyaW5nKHYpLnRyaW0oKTtcbn07XG5jb25zdCBpbnRGaWVsZCA9IChsbzogbnVtYmVyLCBoaTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpID0+IHouY29lcmNlLm51bWJlcih7IGludmFsaWRfdHlwZV9lcnJvcjogbWVzc2FnZSB9KS5pbnQobWVzc2FnZSkubWluKGxvLCBtZXNzYWdlKS5tYXgoaGksIG1lc3NhZ2UpO1xuXG5jb25zdCBzZXR0aW5nc1NjaGVtYSA9IHpcbiAgLm9iamVjdCh7XG4gICAgbmFtZTogei5zdHJpbmcoKS5taW4oMSwgJ0dpdmUgdGhlIGNhbGVuZGFyIGEgbmFtZScpLm1heCgxMjAsICdVc2UgMTIwIGNoYXJhY3RlcnMgb3IgZmV3ZXInKSxcbiAgICB0aW1lem9uZTogei5zdHJpbmcoKS5yZWZpbmUoaXNWYWxpZFRpbWVab25lLCAnUGljayBhIHZhbGlkIHRpbWUgem9uZScpLFxuICAgIGR1cmF0aW9uX21pbnV0ZXM6IGludEZpZWxkKDEwLCAyNDAsICdDYWxsIGxlbmd0aCBtdXN0IGJlIDEw4oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogaW50RmllbGQoNSwgMjQwLCAnU3RhcnQgdGltZXMgbXVzdCBiZSBldmVyeSA14oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBidWZmZXJfbWludXRlczogaW50RmllbGQoMCwgMjQwLCAnQnVmZmVyIG11c3QgYmUgMOKAkzI0MCBtaW51dGVzJyksXG4gICAgbWluX25vdGljZV9taW51dGVzOiBpbnRGaWVsZCgwLCA0MzIwMCwgJ01pbmltdW0gbm90aWNlIG11c3QgYmUgMOKAkzcyMCBob3VycycpLFxuICAgIGhvcml6b25fZGF5czogaW50RmllbGQoMSwgMTIwLCAnQm9vayBhaGVhZCBtdXN0IGJlIDHigJMxMjAgZGF5cycpLFxuICAgIG1heF9wZXJfZGF5OiBpbnRGaWVsZCgxLCAxMDAsICdNYXggcGVyIGRheSBtdXN0IGJlIDHigJMxMDAnKS5udWxsYWJsZSgpLFxuICAgIG1lZXRpbmdfdHlwZTogei5lbnVtKFsncGhvbmUnLCAndmlkZW8nXSksXG4gICAgdmlkZW9fbGluazogei5zdHJpbmcoKS5tYXgoNTAwKS5yZWdleCgvXmh0dHBzOlxcL1xcLy8sICdUaGUgdmlkZW8gbGluayBtdXN0IHN0YXJ0IHdpdGggaHR0cHM6Ly8nKS5udWxsYWJsZSgpLFxuICAgIGFjdGl2ZTogei5ib29sZWFuKCksXG4gIH0pXG4gIC5yZWZpbmUoKHMpID0+IHMubWVldGluZ190eXBlICE9PSAndmlkZW8nIHx8ICEhcy52aWRlb19saW5rLCB7IG1lc3NhZ2U6ICdBZGQgdGhlIHZpZGVvIGxpbmsgY2FsbGVycyB3aWxsIGpvaW4nLCBwYXRoOiBbJ3ZpZGVvX2xpbmsnXSB9KTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJTZXR0aW5ncyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgY29uc3Qgbm90aWNlID0gZmllbGQoZm9ybURhdGEsICdtaW5fbm90aWNlX2hvdXJzJyk7XG4gIGNvbnN0IHBhcnNlZCA9IHNldHRpbmdzU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgbmFtZTogZmllbGQoZm9ybURhdGEsICduYW1lJyksXG4gICAgdGltZXpvbmU6IGZpZWxkKGZvcm1EYXRhLCAndGltZXpvbmUnKSxcbiAgICBkdXJhdGlvbl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2R1cmF0aW9uX21pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogZmllbGQoZm9ybURhdGEsICdzbG90X3N0ZXBfbWludXRlcycpLFxuICAgIGJ1ZmZlcl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2J1ZmZlcl9taW51dGVzJykgfHwgMCxcbiAgICBtaW5fbm90aWNlX21pbnV0ZXM6IG5vdGljZSA/IE1hdGgucm91bmQoTnVtYmVyKG5vdGljZSkgKiA2MCkgOiAwLFxuICAgIGhvcml6b25fZGF5czogZmllbGQoZm9ybURhdGEsICdob3Jpem9uX2RheXMnKSxcbiAgICBtYXhfcGVyX2RheTogZmllbGQoZm9ybURhdGEsICdtYXhfcGVyX2RheScpIHx8IG51bGwsXG4gICAgbWVldGluZ190eXBlOiBmaWVsZChmb3JtRGF0YSwgJ21lZXRpbmdfdHlwZScpLFxuICAgIHZpZGVvX2xpbms6IGZpZWxkKGZvcm1EYXRhLCAndmlkZW9fbGluaycpIHx8IG51bGwsXG4gICAgYWN0aXZlOiBmb3JtRGF0YS5nZXQoJ2FjdGl2ZScpID09PSAnb24nLFxuICB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgZXJyb3I6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgPz8gJ0NoZWNrIHRoZSBzZXR0aW5ncycgfTtcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJzJykudXBkYXRlKHBhcnNlZC5kYXRhKS5lcSgnaWQnLCBtLmNhbGVuZGFyLmlkKS5zZWxlY3QoJ2lkJyk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgaWYgKCEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHJldHVybiB7IGVycm9yOiAnWW91IGNhbuKAmXQgY2hhbmdlIHRoaXMgY2FsZW5kYXIuJyB9O1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbiAgcmV0dXJuIHsgc3VjY2VzczogJ1NldHRpbmdzIHNhdmVkJyB9O1xufVxuXG5jb25zdCBydWxlU2NoZW1hID0gelxuICAub2JqZWN0KHsgd2Vla2RheTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDYpLCBzdGFydE1pbnV0ZTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDE0MzkpLCBlbmRNaW51dGU6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgxNDQwKSB9KVxuICAucmVmaW5lKChyKSA9PiByLmVuZE1pbnV0ZSA+IHIuc3RhcnRNaW51dGUsICdFbmQgdGltZSBtdXN0IGJlIGFmdGVyIHN0YXJ0IHRpbWUnKTtcblxuLyoqIFJlcGxhY2UgdGhlIGNhbGVuZGFyJ3Mgd2Vla2x5IGhvdXJzIChXZWVrbHlFZGl0b3IncyBgcnVsZXNgIEpTT04pLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJSdWxlcyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgbGV0IHJhdzogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICByYXcgPSBKU09OLnBhcnNlKFN0cmluZyhmb3JtRGF0YS5nZXQoJ3J1bGVzJykgPz8gJ1tdJykpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIHRoZSBob3VycycgfTtcbiAgfVxuICBjb25zdCBwYXJzZWQgPSB6LmFycmF5KHJ1bGVTY2hlbWEpLm1heCg1MCkuc2FmZVBhcnNlKHJhdyk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgaG91cnMnIH07XG4gIGNvbnN0IHJ1bGVzID0gcGFyc2VkLmRhdGE7XG4gIGZvciAobGV0IGQgPSAwOyBkIDwgNzsgZCsrKSB7XG4gICAgY29uc3QgZGF5ID0gcnVsZXMuZmlsdGVyKChyKSA9PiByLndlZWtkYXkgPT09IGQpLnNvcnQoKGEsIGIpID0+IGEuc3RhcnRNaW51dGUgLSBiLnN0YXJ0TWludXRlKTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGRheS5sZW5ndGg7IGkrKykgaWYgKGRheVtpXS5zdGFydE1pbnV0ZSA8IGRheVtpIC0gMV0uZW5kTWludXRlKSByZXR1cm4geyBlcnJvcjogJ0hvdXJzIG9uIHRoZSBzYW1lIGRheSBvdmVybGFwJyB9O1xuICB9XG4gIGNvbnN0IGRiID0gbS5jdHgudXNlckRiO1xuICBjb25zdCB7IGVycm9yOiBkZWxFcnJvciB9ID0gYXdhaXQgZGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcl9ydWxlcycpLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpO1xuICBpZiAoZGVsRXJyb3IpIHJldHVybiB7IGVycm9yOiBkZWxFcnJvci5tZXNzYWdlIH07XG4gIGlmIChydWxlcy5sZW5ndGgpIHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBkYi5mcm9tKCdib29raW5nX2NhbGVuZGFyX3J1bGVzJykuaW5zZXJ0KFxuICAgICAgcnVsZXMubWFwKChyKSA9PiAoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgd2Vla2RheTogci53ZWVrZGF5LCBzdGFydF9taW51dGU6IHIuc3RhcnRNaW51dGUsIGVuZF9taW51dGU6IHIuZW5kTWludXRlIH0pKVxuICAgICk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4geyBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG4gIHJlZnJlc2hDYWxlbmRhcigpO1xuICByZXR1cm4geyBzdWNjZXNzOiBydWxlcy5sZW5ndGggPyAnSG91cnMgc2F2ZWQnIDogJ0hvdXJzIGNsZWFyZWQ6IG5vdGhpbmcgY2FuIGJlIGJvb2tlZCB1bnRpbCB5b3UgYWRkIHNvbWUnIH07XG59XG5cbi8qKiBQZW9wbGUgd2hvIG1heSBob3N0IGEgY2FsZW5kYXI6IHRlYW0gLyBzYWxlcyB0YWtlIEhvbWVRdW90ZSBhZG1pbnMgKyBzZXR0ZXJzOyBhIGNvbnRyYWN0b3IgY2FsZW5kYXIgaXRzIG93biBjb21wYW55J3MgdXNlcnMuICovXG5hc3luYyBmdW5jdGlvbiBlbGlnaWJsZUhvc3QoY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciwgdXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjcmVhdGVBZG1pbkNsaWVudCgpLmZyb20oJ3Byb2ZpbGVzJykuc2VsZWN0KCdpZCwgcm9sZSwgY29udHJhY3Rvcl9pZCwgaXNfYWN0aXZlJykuZXEoJ2lkJywgdXNlcklkKS5tYXliZVNpbmdsZSgpO1xuICBpZiAoIXAgfHwgcC5pc19hY3RpdmUgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBjYWxlbmRhci5raW5kID09PSAnY29udHJhY3RvcicgPyBwLnJvbGUgPT09ICdjb250cmFjdG9yJyAmJiBwLmNvbnRyYWN0b3JfaWQgPT09IGNhbGVuZGFyLmNvbnRyYWN0b3JJZCA6IHAucm9sZSA9PT0gJ2FkbWluJyB8fCBwLnJvbGUgPT09ICdzZXR0ZXInO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQm9va2luZ0NhbGVuZGFyTWVtYmVyKGNhbGVuZGFySWQ6IHN0cmluZywgX3ByZXY6IFNldHRpbmdzU3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8U2V0dGluZ3NTdGF0ZT4ge1xuICBjb25zdCBtID0gYXdhaXQgbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQpO1xuICBpZiAoJ2Vycm9yJyBpbiBtKSByZXR1cm4geyBlcnJvcjogbS5lcnJvciB9O1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZSh1c2VySWQpLnN1Y2Nlc3MgfHwgIShhd2FpdCBlbGlnaWJsZUhvc3QobS5jYWxlbmRhciwgdXNlcklkKSkpIHJldHVybiB7IGVycm9yOiAnUGljayBhIHBlcnNvbiB0byBhZGQnIH07XG4gIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IG0uY3R4LnVzZXJEYlxuICAgIC5mcm9tKCdib29raW5nX2NhbGVuZGFyX21lbWJlcnMnKVxuICAgIC51cHNlcnQoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgdXNlcl9pZDogdXNlcklkLCBub3RpZnk6IHRydWUgfSwgeyBvbkNvbmZsaWN0OiAnY2FsZW5kYXJfaWQsdXNlcl9pZCcgfSk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgcmVmcmVzaENhbGVuZGFyKCk7XG4gIHJldHVybiB7IHN1Y2Nlc3M6ICdIb3N0IGFkZGVkJyB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va2luZ0NhbGVuZGFyTWVtYmVyKGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjYWxlbmRhcklkID0gZmllbGQoZm9ybURhdGEsICdjYWxlbmRhcl9pZCcpID8/ICcnO1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgY29uc3Qgb3AgPSBmaWVsZChmb3JtRGF0YSwgJ29wJyk7XG4gIGNvbnN0IG0gPSBhd2FpdCBtYW5hZ2VhYmxlQ2FsZW5kYXIoY2FsZW5kYXJJZCk7XG4gIGlmICgnZXJyb3InIGluIG0gfHwgIXV1aWQuc2FmZVBhcnNlKHVzZXJJZCkuc3VjY2VzcykgcmV0dXJuO1xuICBjb25zdCBtZW1iZXJzID0gbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJfbWVtYmVycycpO1xuICBpZiAob3AgPT09ICdyZW1vdmUnKSBhd2FpdCBtZW1iZXJzLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpLmVxKCd1c2VyX2lkJywgdXNlcklkKTtcbiAgZWxzZSBpZiAob3AgPT09ICdub3RpZnlfb24nIHx8IG9wID09PSAnbm90aWZ5X29mZicpIGF3YWl0IG1lbWJlcnMudXBkYXRlKHsgbm90aWZ5OiBvcCA9PT0gJ25vdGlmeV9vbicgfSkuZXEoJ2NhbGVuZGFyX2lkJywgbS5jYWxlbmRhci5pZCkuZXEoJ3VzZXJfaWQnLCB1c2VySWQpO1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiZ1NBc1JzQiJ9
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/actions/data:4b499e [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"6014c0fccb4f5d53ada14351171599720c7b233c43":"searchBookable"},"lib/actions/booking.ts",""] */ __turbopack_context__.s([
    "searchBookable",
    ()=>searchBookable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var searchBookable = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("6014c0fccb4f5d53ada14351171599720c7b233c43", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "searchBookable"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYm9va2luZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcic7XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgLS0gcm93cyBjb21lIGZyb20gdGhlIHVudHlwZWQgU3VwYWJhc2UgY2xpZW50LCBhcyBlbHNld2hlcmUgaW4gbGliL2RhdGEgKi9cbmltcG9ydCB7IHJldmFsaWRhdGVQYXRoIH0gZnJvbSAnbmV4dC9jYWNoZSc7XG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcbmltcG9ydCB7IHJlcXVpcmVQcm9maWxlIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9zZXJ2ZXInO1xuaW1wb3J0IHsgY3JlYXRlQWRtaW5DbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9hZG1pbic7XG5pbXBvcnQgeyBnZXRTbG90cyB9IGZyb20gJ0AvbGliL2Jvb2tpbmcvc2xvdHMuc2VydmVyJztcbmltcG9ydCB7XG4gIGJvb2tBcHBvaW50bWVudCxcbiAgYm9va1NhbGVzQXBwb2ludG1lbnQsXG4gIGNhbmNlbEFwcG9pbnRtZW50LFxuICBjYW5jZWxTYWxlc0FwcG9pbnRtZW50LFxuICByZXNjaGVkdWxlQXBwb2ludG1lbnQsXG4gIHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50LFxufSBmcm9tICdAL2xpYi9ib29raW5nL2Jvb2suc2VydmVyJztcbmltcG9ydCB7IG5vdGlmeUJvb2tpbmdTb29uIH0gZnJvbSAnQC9saWIvYm9va2luZy9ub3RpZnkuc2VydmVyJztcbmltcG9ydCB7IEJPT0tJTkdfRVJST1JfTUVTU0FHRVMsIG1hcENhbGVuZGFyLCBQSUNLX0FOT1RIRVJfVElNRSwgdHlwZSBCb29raW5nQ2FsZW5kYXIsIHR5cGUgQm9va2luZ0Vycm9yIH0gZnJvbSAnQC9saWIvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgeyBpc1ZhbGlkVGltZVpvbmUgfSBmcm9tICdAL2xpYi9hdmFpbGFiaWxpdHkvdGltZSc7XG5pbXBvcnQgeyBmbHVzaE5vdGlmaWNhdGlvbnNTb29uIH0gZnJvbSAnQC9saWIvbm90aWZpY2F0aW9ucy9vdXRib3gnO1xuaW1wb3J0IHsgZmx1c2hDYWxlbmRhclN5bmNTb29uIH0gZnJvbSAnQC9saWIvY2FsZW5kYXIvc3luYy5zZXJ2ZXInO1xuaW1wb3J0IHsgY2FuTWFuYWdlQ2FsZW5kYXIsIGNhbk92ZXJyaWRlU2xvdHMsIGNhblVzZUNhbGVuZGFyUGFnZSwgY2FuV29ya0NhbGVuZGFyLCB0eXBlIENhbGVuZGFyVmlld2VyIH0gZnJvbSAnQC9jb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcyc7XG5pbXBvcnQgdHlwZSB7IFB1YmxpY1Nsb3QgfSBmcm9tICdAL2NvbXBvbmVudHMvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IFByb2ZpbGUgfSBmcm9tICdAL2xpYi90eXBlcyc7XG5cbi8qKlxuICogSW4tYXBwIGNhbGVuZGFyIGFjdGlvbnMgKGFwcC9hcHAvY2FsZW5kYXIpOiBzbG90cyBmb3IgdGhlIHBpY2tlciwgYm9vayBhXG4gKiBjYWxsIG9uIHNvbWVvbmUncyBiZWhhbGYsIHJlc2NoZWR1bGUsIGNhbmNlbCwgaGVsZCAvIG5vLXNob3csIGFuZCB0aGVcbiAqIGJvb2tpbmctY2FsZW5kYXIgc2V0dGluZ3MuXG4gKlxuICogRXZlcnkgYWN0aW9uIGZpcnN0IHJlYWRzIHRoZSBjYWxlbmRhciAvIGJvb2tpbmcgLyBsZWFkIHRocm91Z2ggdGhlXG4gKiBzaWduZWQtaW4gdXNlcidzIE9XTiBjbGllbnQsIHNvIFJMUyAoMDA2OCkgZGVjaWRlcyB3aGV0aGVyIHRoZXkgbWF5IHNlZSBpdCxcbiAqIHRoZW4gYXBwbGllcyB0aGUgcm9sZSBydWxlcyBpbiBjb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcy50cyAoYSBjb250cmFjdG9yXG4gKiB3b3JrcyBvbmx5IGl0cyBvd24gY2FsZW5kYXIpLiBPbmx5IHRoZW4gZG9lcyB0aGUgc2VydmljZS1yb2xlIGJvb2tpbmcgUlBDXG4gKiBydW4sIHdoaWNoIHJlLWNoZWNrcyB0aGUgc2xvdCB1bmRlciB0aGUgY2FsZW5kYXIgbG9jay4gU3RhdHVzIGNoYW5nZXMgYW5kXG4gKiBzZXR0aW5ncyBzdGF5IG9uIHRoZSB1c2VyJ3MgY2xpZW50IChSTFMgd3JpdGUgcG9saWNpZXMgYXBwbHkgYXMgdGhleSBhcmUpLlxuICogSG9tZW93bmVyIC8gcHJvc3BlY3Qgbm90aWNlcyBnbyBvdXQgYWZ0ZXIgdGhlIHJlc3BvbnNlIChub3RpZnlCb29raW5nU29vbik7XG4gKiBwdXNoIGFuZCBHb29nbGUgc3luYyBjb21lIGZyb20gdGhlIERCIHRyaWdnZXJzIGFuZCBhcmUgZmx1c2hlZCBoZXJlLlxuICovXG5cbmV4cG9ydCB0eXBlIEFjdGlvblJlc3VsdDxUID0gb2JqZWN0PiA9ICh7IG9rOiB0cnVlIH0gJiBUKSB8IHsgb2s6IGZhbHNlOyBlcnJvcjogc3RyaW5nOyBwaWNrQW5vdGhlcj86IGJvb2xlYW4gfTtcbmV4cG9ydCB0eXBlIFNldHRpbmdzU3RhdGUgPSB7IGVycm9yPzogc3RyaW5nOyBzdWNjZXNzPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG5cbnR5cGUgRXZlbnRLaW5kSW5wdXQgPSAnYXBwb2ludG1lbnQnIHwgJ3Zpc2l0JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG5cbi8qKiBIb3N0LWZhY2luZyB3b3JkaW5nICh0aGUgaG9tZW93bmVyIG1lc3NhZ2VzIHNheSBcInlvdVwiOyBzdGFmZiBuZWVkIHRvIGtub3cgd2hhdCBoYXBwZW5lZCkuICovXG5jb25zdCBIT1NUX01FU1NBR0VTOiBQYXJ0aWFsPFJlY29yZDxCb29raW5nRXJyb3IsIHN0cmluZz4+ID0ge1xuICBhbHJlYWR5X2Jvb2tlZDogJ1RoaXMgbGVhZCBhbHJlYWR5IGhhcyBhIGNhbGwgYm9va2VkIGZyb20gdGhlIGZ1bm5lbC4nLFxuICBub3RfYm9va2FibGU6ICdUaGlzIGFwcG9pbnRtZW50IGlzIG5vdCBvbiBhIGJvb2tpbmcgY2FsZW5kYXIuIENoYW5nZSBpdCBmcm9tIHRoZSBsZWFkLicsXG4gIG5vdF9hY3RpdmU6ICdPbmx5IGEgc2NoZWR1bGVkIGNhbGwgY2FuIGJlIGNoYW5nZWQuJyxcbiAgbGVhZF9ub3RfZm91bmQ6ICdMZWFkIG5vdCBmb3VuZC4nLFxuICBhc3NpZ25tZW50X21pc21hdGNoOiAnVGhhdCBsZWFkIGlzIG5vdCBhc3NpZ25lZCB0byB0aGlzIGNvbnRyYWN0b3IuJyxcbiAgd3JvbmdfY2FsZW5kYXI6ICdUaGlzIGxlYWQgY2Fubm90IGJlIGJvb2tlZCBvbiB0aGF0IGNhbGVuZGFyLicsXG4gIGNhbGVuZGFyX2J1c3k6ICdBIGhvc3TigJlzIEdvb2dsZSBDYWxlbmRhciBpcyBidXN5IHRoZW4uIFBpY2sgYW5vdGhlciB0aW1lLicsXG59O1xuY29uc3QgbWVzc2FnZUZvciA9IChlOiBCb29raW5nRXJyb3IpID0+IEhPU1RfTUVTU0FHRVNbZV0gPz8gQk9PS0lOR19FUlJPUl9NRVNTQUdFU1tlXTtcbmNvbnN0IGZhaWxlZCA9IChlOiBCb29raW5nRXJyb3IpOiB7IG9rOiBmYWxzZTsgZXJyb3I6IHN0cmluZzsgcGlja0Fub3RoZXI/OiBib29sZWFuIH0gPT4gKHsgb2s6IGZhbHNlLCBlcnJvcjogbWVzc2FnZUZvcihlKSwgcGlja0Fub3RoZXI6IFBJQ0tfQU5PVEhFUl9USU1FLmhhcyhlKSB8fCB1bmRlZmluZWQgfSk7XG5jb25zdCBkZW5pZWQgPSB7IG9rOiBmYWxzZSBhcyBjb25zdCwgZXJyb3I6ICdZb3UgZG9u4oCZdCBoYXZlIGFjY2VzcyB0byB0aGlzIGNhbGVuZGFyLicgfTtcblxuY29uc3QgdXVpZCA9IHouc3RyaW5nKCkudXVpZCgpO1xuY29uc3QgaXNvID0gei5zdHJpbmcoKS5yZWZpbmUoKHYpID0+IE51bWJlci5pc0Zpbml0ZShEYXRlLnBhcnNlKHYpKSwgJ1BpY2sgYSB2YWxpZCB0aW1lJyk7XG5cbmludGVyZmFjZSBDdHgge1xuICBwcm9maWxlOiBQcm9maWxlO1xuICB2aWV3ZXI6IENhbGVuZGFyVmlld2VyO1xuICB1c2VyRGI6IGFueTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29udGV4dCgpOiBQcm9taXNlPEN0eCB8IG51bGw+IHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGNvbnN0IHZpZXdlcjogQ2FsZW5kYXJWaWV3ZXIgPSB7IGlkOiBwcm9maWxlLmlkLCByb2xlOiBwcm9maWxlLnJvbGUsIGNvbnRyYWN0b3JfaWQ6IHByb2ZpbGUuY29udHJhY3Rvcl9pZCwgY29udHJhY3Rvcl9yb2xlOiBwcm9maWxlLmNvbnRyYWN0b3Jfcm9sZSB9O1xuICBpZiAoIWNhblVzZUNhbGVuZGFyUGFnZSh2aWV3ZXIpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgcHJvZmlsZSwgdmlld2VyLCB1c2VyRGI6IGF3YWl0IGNyZWF0ZUNsaWVudCgpIH07XG59XG5cbi8qKiBUaGUgY2FsZW5kYXIsIHJlYWQgdGhyb3VnaCB0aGUgdXNlcidzIGNsaWVudCAoUkxTKSwgb3IgbnVsbC4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZpc2libGVDYWxlbmRhcih1c2VyRGI6IGFueSwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ0NhbGVuZGFyIHwgbnVsbD4ge1xuICBpZiAoIXV1aWQuc2FmZVBhcnNlKGlkKS5zdWNjZXNzKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCB1c2VyRGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcnMnKS5zZWxlY3QoJyonKS5lcSgnaWQnLCBpZCkubWF5YmVTaW5nbGUoKTtcbiAgcmV0dXJuIGRhdGEgPyBtYXBDYWxlbmRhcihkYXRhKSA6IG51bGw7XG59XG5cbmludGVyZmFjZSBCb29raW5nUmVmIHtcbiAga2luZDogJ2FwcG9pbnRtZW50JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG4gIGlkOiBzdHJpbmc7XG4gIGNhbGVuZGFyOiBCb29raW5nQ2FsZW5kYXIgfCBudWxsO1xuICAvKiogQ29udHJhY3RvciB0aGF0IG93bnMgYSB2aXNpdCAobm8gY2FsZW5kYXIpIHRocm91Z2ggaXRzIGFzc2lnbm1lbnQuICovXG4gIHZpc2l0Q29udHJhY3RvcklkOiBzdHJpbmcgfCBudWxsO1xuICBsZWFkSWQ6IHN0cmluZyB8IG51bGw7XG4gIHNjaGVkdWxlZEF0OiBzdHJpbmcgfCBudWxsO1xuICBzdGF0dXM6IHN0cmluZztcbn1cblxuLyoqIEEgYm9va2luZyB0aGUgdXNlciBjYW4gc2VlIChSTFMpICsgd2hldGhlciB0aGUgcm9sZSBydWxlcyBsZXQgdGhlbSB3b3JrIGl0LiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya2FibGVCb29raW5nKGN0eDogQ3R4LCBraW5kOiBFdmVudEtpbmRJbnB1dCwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ1JlZiB8IG51bGw+IHtcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZShpZCkuc3VjY2VzcykgcmV0dXJuIG51bGw7XG4gIGlmIChraW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ3Byb3NwZWN0X3NhbGVzX2FwcG9pbnRtZW50cycpLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cycpLmVxKCdpZCcsIGlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gICAgLy8gU2FsZXMgbWVldGluZ3MgYXJlIEhvbWVRdW90ZSdzIG93bjogbmV2ZXIgYSBjb250cmFjdG9yJ3MuXG4gICAgaWYgKGN0eC52aWV3ZXIucm9sZSAhPT0gJ2FkbWluJyAmJiBjdHgudmlld2VyLnJvbGUgIT09ICdzZXR0ZXInKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjYWxlbmRhciA9IGRhdGEuY2FsZW5kYXJfaWQgPyBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgZGF0YS5jYWxlbmRhcl9pZCkgOiBudWxsO1xuICAgIHJldHVybiB7IGtpbmQsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IG51bGwsIGxlYWRJZDogbnVsbCwgc2NoZWR1bGVkQXQ6IGRhdGEuc2NoZWR1bGVkX2F0LCBzdGF0dXM6IGRhdGEuc3RhdHVzIH07XG4gIH1cbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiXG4gICAgLmZyb20oJ2FwcG9pbnRtZW50cycpXG4gICAgLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBsZWFkX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cywgYXNzaWdubWVudDpsZWFkX2Fzc2lnbm1lbnRzKGNvbnRyYWN0b3JfaWQsIGxlYWRfaWQpJylcbiAgICAuZXEoJ2lkJywgaWQpXG4gICAgLm1heWJlU2luZ2xlKCk7XG4gIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGFzZyA9IEFycmF5LmlzQXJyYXkoZGF0YS5hc3NpZ25tZW50KSA/IGRhdGEuYXNzaWdubWVudFswXSA6IGRhdGEuYXNzaWdubWVudDtcbiAgY29uc3QgY2FsZW5kYXIgPSBkYXRhLmNhbGVuZGFyX2lkID8gYXdhaXQgdmlzaWJsZUNhbGVuZGFyKGN0eC51c2VyRGIsIGRhdGEuY2FsZW5kYXJfaWQpIDogbnVsbDtcbiAgY29uc3QgcmVmOiBCb29raW5nUmVmID0ge1xuICAgIGtpbmQ6ICdhcHBvaW50bWVudCcsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IGRhdGEuY2FsZW5kYXJfaWQgPyBudWxsIDogYXNnPy5jb250cmFjdG9yX2lkID8/IG51bGwsXG4gICAgbGVhZElkOiBkYXRhLmxlYWRfaWQgPz8gYXNnPy5sZWFkX2lkID8/IG51bGwsIHNjaGVkdWxlZEF0OiBkYXRhLnNjaGVkdWxlZF9hdCwgc3RhdHVzOiBkYXRhLnN0YXR1cyxcbiAgfTtcbiAgaWYgKGNhbGVuZGFyKSByZXR1cm4gY2FuV29ya0NhbGVuZGFyKGN0eC52aWV3ZXIsIGNhbGVuZGFyKSA/IHJlZiA6IG51bGw7XG4gIC8vIEEgdmlzaXQgd2l0aCBubyBjYWxlbmRhcjogc3RhZmYsIG9yIHRoZSBjb250cmFjdG9yIHdob3NlIGFzc2lnbm1lbnQgaXQgaXMuXG4gIGNvbnN0IHN0YWZmID0gY3R4LnZpZXdlci5yb2xlID09PSAnYWRtaW4nIHx8IGN0eC52aWV3ZXIucm9sZSA9PT0gJ3NldHRlcic7XG4gIHJldHVybiBzdGFmZiB8fCAocmVmLnZpc2l0Q29udHJhY3RvcklkICE9PSBudWxsICYmIHJlZi52aXNpdENvbnRyYWN0b3JJZCA9PT0gY3R4LnZpZXdlci5jb250cmFjdG9yX2lkKSA/IHJlZiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGVuZGFyJyk7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2FwcG9pbnRtZW50cycpO1xuICBpZiAobGVhZElkKSB7XG4gICAgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvbGVhZHMnKTtcbiAgICByZXZhbGlkYXRlUGF0aChgL2FwcC9sZWFkcy8ke2xlYWRJZH1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlckNoYW5nZShsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGZsdXNoTm90aWZpY2F0aW9uc1Nvb24oKTtcbiAgZmx1c2hDYWxlbmRhclN5bmNTb29uKCk7XG4gIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhdWRpdE92ZXJyaWRlKGFjdG9ySWQ6IHN0cmluZywgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIC8vIFNlcnZpY2Ugcm9sZTogYXVkaXRfbG9ncyBpcyBpbnNlcnQtcmVzdHJpY3RlZCB0byBhZG1pbnMgYnkgUkxTLCBidXQgc2V0dGVycyBtYXkgb3ZlcnJpZGUgdG9vIChhcyBvbiB0aGUgbGVhZCBwYWdlKS5cbiAgYXdhaXQgY3JlYXRlQWRtaW5DbGllbnQoKS5mcm9tKCdhdWRpdF9sb2dzJykuaW5zZXJ0KHsgYWN0b3JfaWQ6IGFjdG9ySWQsIGFjdGlvbjogJ2FwcG9pbnRtZW50LmF2YWlsYWJpbGl0eV9vdmVycmlkZScsIHRhcmdldF91c2VyX2lkOiBudWxsLCBtZXRhZGF0YSB9KTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBTbG90cyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTbG90c1BheWxvYWQge1xuICBzbG90czogUHVibGljU2xvdFtdO1xuICB0aW1lWm9uZTogc3RyaW5nO1xuICBkdXJhdGlvbk1pbnV0ZXM6IG51bWJlcjtcbiAgLyoqIFRoZSBib29raW5nJ3MgY3VycmVudCBzdGFydCAocmVzY2hlZHVsaW5nKS4gKi9cbiAgY3VycmVudDogc3RyaW5nIHwgbnVsbDtcbn1cblxuLyoqIE9wZW4gdGltZXMgb24gYSBjYWxlbmRhciBmb3IgdGhlIHBpY2tlcjsgd2l0aCBgcmVzY2hlZHVsZWAsIHRoYXQgYm9va2luZydzIG93biB0aW1lIGRvZXMgbm90IGJsb2NrLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENhbGVuZGFyU2xvdHMoaW5wdXQ6IHsgY2FsZW5kYXJJZDogc3RyaW5nOyByZXNjaGVkdWxlPzogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZyB9IH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdDxTbG90c1BheWxvYWQ+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBpbnB1dC5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICBsZXQgY3VycmVudDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIGxldCBleGNsdWRlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGlucHV0LnJlc2NoZWR1bGUpIHtcbiAgICBjb25zdCByZWYgPSBhd2FpdCB3b3JrYWJsZUJvb2tpbmcoY3R4LCBpbnB1dC5yZXNjaGVkdWxlLmtpbmQsIGlucHV0LnJlc2NoZWR1bGUuaWQpO1xuICAgIGlmICghcmVmIHx8IHJlZi5jYWxlbmRhcj8uaWQgIT09IGNhbC5pZCkgcmV0dXJuIGRlbmllZDtcbiAgICBjdXJyZW50ID0gcmVmLnNjaGVkdWxlZEF0ID8gbmV3IERhdGUocmVmLnNjaGVkdWxlZEF0KS50b0lTT1N0cmluZygpIDogbnVsbDtcbiAgICBleGNsdWRlSWQgPSByZWYuaWQ7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCByID0gYXdhaXQgZ2V0U2xvdHMoY2FsLmlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBleGNsdWRlSWQgfSk7XG4gICAgaWYgKCFyKSByZXR1cm4gZGVuaWVkO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHNsb3RzOiByLnNsb3RzLm1hcCgocykgPT4gKHsgc3RhcnQ6IG5ldyBEYXRlKHMuc3RhcnRNcykudG9JU09TdHJpbmcoKSwgZW5kOiBuZXcgRGF0ZShzLmVuZE1zKS50b0lTT1N0cmluZygpIH0pKSxcbiAgICAgIHRpbWVab25lOiByLmNhbGVuZGFyLnRpbWV6b25lLFxuICAgICAgZHVyYXRpb25NaW51dGVzOiByLmNhbGVuZGFyLmR1cmF0aW9uTWludXRlcyxcbiAgICAgIGN1cnJlbnQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhaWxlZCgndW5hdmFpbGFibGUnKTtcbiAgfVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qIFdobyBjYW4gYmUgYm9va2VkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvb2thYmxlUGFydHkge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nIHwgbnVsbDtcbiAgcGhvbmU6IHN0cmluZyB8IG51bGw7XG59XG5cbmNvbnN0IHNlYXJjaElucHV0ID0gei5vYmplY3QoeyBjYWxlbmRhcklkOiB1dWlkLCBxdWVyeTogei5zdHJpbmcoKS50cmltKCkubWF4KDgwKSB9KTtcblxuLyoqXG4gKiBMZWFkcyAoaG9tZW93bmVyIGNhbGVuZGFycykgb3IgY29udHJhY3RvciBwcm9zcGVjdHMgKHNhbGVzIGNhbGVuZGFyKSB0aGVcbiAqIHVzZXIgbWF5IGJvb2ssIG1hdGNoaW5nIGEgbmFtZSAvIHBob25lIC8gZW1haWwuIFJMUyBzY29wZXMgdGhlIHNlYXJjaDpcbiAqIHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdCwgYSBzZXR0ZXJcbiAqIG9ubHkgcHJvc3BlY3RzIGFzc2lnbmVkIHRvIHRoZW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWFyY2hCb29rYWJsZShjYWxlbmRhcklkOiBzdHJpbmcsIHF1ZXJ5OiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvblJlc3VsdDx7IHJlc3VsdHM6IEJvb2thYmxlUGFydHlbXSB9Pj4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBzZWFyY2hJbnB1dC5zYWZlUGFyc2UoeyBjYWxlbmRhcklkLCBxdWVyeSB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IHRydWUsIHJlc3VsdHM6IFtdIH07XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBwYXJzZWQuZGF0YS5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICAvLyBQb3N0Z1JFU1Qgb3ItZmlsdGVyOiBzdHJpcCB0aGUgY2hhcmFjdGVycyB0aGF0IHdvdWxkIGNoYW5nZSBpdHMgbWVhbmluZy5cbiAgY29uc3QgcSA9IHBhcnNlZC5kYXRhLnF1ZXJ5LnJlcGxhY2UoL1ssKCkqJVxcXFxdL2csICcgJykudHJpbSgpO1xuICBjb25zdCBkaWdpdHMgPSBxLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgbGV0IHJlcSA9IGN0eC51c2VyRGIuZnJvbSgnY29udHJhY3Rvcl9wcm9zcGVjdHMnKS5zZWxlY3QoJ2lkLCBjb21wYW55X25hbWUsIGRlY2lzaW9uX21ha2VyX25hbWUsIHBob25lLCBjaXR5Jykub3JkZXIoJ3VwZGF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICAgIGlmIChxKSByZXEgPSByZXEub3IoW2Bjb21wYW55X25hbWUuaWxpa2UuKiR7cX0qYCwgYGRlY2lzaW9uX21ha2VyX25hbWUuaWxpa2UuKiR7cX0qYCwgLi4uKGRpZ2l0cy5sZW5ndGggPj0gMyA/IFtgcGhvbmVfZTE2NC5pbGlrZS4qJHtkaWdpdHN9KmBdIDogW10pXS5qb2luKCcsJykpO1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHJlc3VsdHM6ICgoZGF0YSA/PyBbXSkgYXMgYW55W10pLm1hcCgocCkgPT4gKHtcbiAgICAgICAgaWQ6IHAuaWQsIG5hbWU6IHAuZGVjaXNpb25fbWFrZXJfbmFtZSA/IGAke3AuZGVjaXNpb25fbWFrZXJfbmFtZX0gwrcgJHtwLmNvbXBhbnlfbmFtZX1gIDogcC5jb21wYW55X25hbWUsIGRldGFpbDogcC5jaXR5ID8/IG51bGwsIHBob25lOiBwLnBob25lID8/IG51bGwsXG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIGxldCByZXEgPSBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwaG9uZSwgZW1haWwsIGNpdHksIHZlcnRpY2FsX2lkJykub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICBpZiAoY2FsLmtpbmQgPT09ICdjb250cmFjdG9yJykge1xuICAgIC8vIE9ubHkgbGVhZHMgYXNzaWduZWQgdG8gdGhpcyBjYWxlbmRhcidzIGNvbnRyYWN0b3IgY2FuIGdvIG9uIGl0ICh0aGUgUlBDIGxpbmtzIHRoZSBhc3NpZ25tZW50KS5cbiAgICBjb25zdCB7IGRhdGE6IGFzZyB9ID0gYXdhaXQgY3R4LnVzZXJEYlxuICAgICAgLmZyb20oJ2xlYWRfYXNzaWdubWVudHMnKVxuICAgICAgLnNlbGVjdCgnbGVhZF9pZCcpXG4gICAgICAuZXEoJ2NvbnRyYWN0b3JfaWQnLCBjYWwuY29udHJhY3RvcklkKVxuICAgICAgLm9yZGVyKCdhc3NpZ25lZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLy8gVGhlIG5ld2VzdCAzMDAga2VlcCB0aGUgaWQgbGlzdCB3ZWxsIGluc2lkZSBhIFVSTDsgb2xkZXIgbGVhZHMgYXJlIHJhcmVseSBib29rZWQgZnJvbSBoZXJlLlxuICAgICAgLmxpbWl0KDMwMCk7XG4gICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQoKChhc2cgPz8gW10pIGFzIGFueVtdKS5tYXAoKGEpID0+IGEubGVhZF9pZCBhcyBzdHJpbmcpKV07XG4gICAgaWYgKCFpZHMubGVuZ3RoKSByZXR1cm4geyBvazogdHJ1ZSwgcmVzdWx0czogW10gfTtcbiAgICByZXEgPSByZXEuaW4oJ2lkJywgaWRzKTtcbiAgfVxuICBpZiAocSkge1xuICAgIGNvbnN0IHdvcmRzID0gcS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5zbGljZSgwLCAyKTtcbiAgICBjb25zdCBvcnMgPSBbXG4gICAgICAuLi53b3Jkcy5mbGF0TWFwKCh3KSA9PiBbYGZpcnN0X25hbWUuaWxpa2UuKiR7d30qYCwgYGxhc3RfbmFtZS5pbGlrZS4qJHt3fSpgXSksXG4gICAgICBgZW1haWwuaWxpa2UuKiR7cX0qYCxcbiAgICAgIC4uLihkaWdpdHMubGVuZ3RoID49IDMgPyBbYHBob25lLmlsaWtlLioke2RpZ2l0cy5zbGljZSgtNyl9KmBdIDogW10pLFxuICAgIF07XG4gICAgcmVxID0gcmVxLm9yKG9ycy5qb2luKCcsJykpO1xuICB9XG4gIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICBjb25zdCBsZWFkcyA9IChkYXRhID8/IFtdKSBhcyBhbnlbXTtcbiAgY29uc3QgdmVydGljYWxJZHMgPSBbLi4ubmV3IFNldChsZWFkcy5tYXAoKGwpID0+IGwudmVydGljYWxfaWQpLmZpbHRlcihCb29sZWFuKSldO1xuICBjb25zdCB7IGRhdGE6IHZlcnRpY2FscyB9ID0gdmVydGljYWxJZHMubGVuZ3RoID8gYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCd2ZXJ0aWNhbHMnKS5zZWxlY3QoJ2lkLCBuYW1lJykuaW4oJ2lkJywgdmVydGljYWxJZHMpIDogeyBkYXRhOiBbXSB9O1xuICBjb25zdCB2ZXJ0aWNhbCA9IG5ldyBNYXAoKCh2ZXJ0aWNhbHMgPz8gW10pIGFzIGFueVtdKS5tYXAoKHYpID0+IFt2LmlkIGFzIHN0cmluZywgdi5uYW1lIGFzIHN0cmluZ10pKTtcbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByZXN1bHRzOiBsZWFkcy5tYXAoKGwpID0+ICh7XG4gICAgICBpZDogbC5pZCxcbiAgICAgIG5hbWU6IFtsLmZpcnN0X25hbWUsIGwubGFzdF9uYW1lXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpIHx8IGwucGhvbmUgfHwgbC5lbWFpbCB8fCAnTGVhZCcsXG4gICAgICBkZXRhaWw6IFt2ZXJ0aWNhbC5nZXQobC52ZXJ0aWNhbF9pZCksIGwuY2l0eV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyDCtyAnKSB8fCBudWxsLFxuICAgICAgcGhvbmU6IGwucGhvbmUgPz8gbnVsbCxcbiAgICB9KSksXG4gIH07XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogQm9vayAvIHJlc2NoZWR1bGUgLyBjYW5jZWwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGJvb2tJbnB1dCA9IHoub2JqZWN0KHtcbiAgY2FsZW5kYXJJZDogdXVpZCxcbiAgcGFydHlJZDogdXVpZCxcbiAgc3RhcnRzQXQ6IGlzbyxcbiAgbm90ZXM6IHouc3RyaW5nKCkudHJpbSgpLm1heCgyMDAwKS5vcHRpb25hbCgpLFxuICBvdmVycmlkZTogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogQm9vayBhIGNhbGwgb24gc29tZW9uZSdzIGJlaGFsZjogYSBsZWFkIG9uIGEgaG9tZW93bmVyIGNhbGVuZGFyLCBhIHByb3NwZWN0IG9uIHRoZSBzYWxlcyBjYWxlbmRhci4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBib29rQ2FsbE9uQmVoYWxmKGlucHV0OiB6LmlucHV0PHR5cGVvZiBib29rSW5wdXQ+KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBpZDogc3RyaW5nOyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGJvb2tJbnB1dC5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgYm9va2luZycgfTtcbiAgY29uc3QgeyBjYWxlbmRhcklkLCBwYXJ0eUlkLCBzdGFydHNBdCwgbm90ZXMgfSA9IHBhcnNlZC5kYXRhO1xuICBjb25zdCBjYWwgPSBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgY2FsZW5kYXJJZCk7XG4gIGlmICghY2FsIHx8ICFjYW5Xb3JrQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsKSkgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFjYWwuYWN0aXZlKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnVGhpcyBjYWxlbmRhciBpcyBzd2l0Y2hlZCBvZmYuIFR1cm4gaXQgb24gaW4gaXRzIHNldHRpbmdzIGZpcnN0LicgfTtcbiAgY29uc3Qgb3ZlcnJpZGUgPSAhIXBhcnNlZC5kYXRhLm92ZXJyaWRlICYmIGNhbk92ZXJyaWRlU2xvdHMoY3R4LnZpZXdlcik7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgLy8gUkxTOiBhZG1pbnMgc2VlIGV2ZXJ5IHByb3NwZWN0LCBhIHNldHRlciBvbmx5IHRob3NlIGFzc2lnbmVkIHRvIHRoZW0uXG4gICAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2NvbnRyYWN0b3JfcHJvc3BlY3RzJykuc2VsZWN0KCdpZCwgY29tcGFueV9uYW1lLCBkZWNpc2lvbl9tYWtlcl9uYW1lLCBwaG9uZSwgZW1haWwnKS5lcSgnaWQnLCBwYXJ0eUlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghcCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ1Byb3NwZWN0IG5vdCBmb3VuZC4nIH07XG4gICAgY29uc3QgciA9IGF3YWl0IGJvb2tTYWxlc0FwcG9pbnRtZW50KHtcbiAgICAgIGNhbGVuZGFySWQ6IGNhbC5pZCwgc3RhcnRzQXQsIHByb3NwZWN0SWQ6IHAuaWQsXG4gICAgICAvLyBUaGUgcGVyc29uIGJvb2tpbmcgaXMgY3JlZGl0ZWQsIGFzIGluIHRoZSBjYWxsaW5nIHdvcmtzcGFjZSAoc2V0dGVyIHBheSwgMDA2MikuXG4gICAgICBwYXJ0bmVySWQ6IGN0eC5wcm9maWxlLmlkLCBzb3VyY2U6ICdtYW51YWwnLFxuICAgICAgY29udGFjdDogeyBuYW1lOiBwLmRlY2lzaW9uX21ha2VyX25hbWUgPz8gdW5kZWZpbmVkLCBwaG9uZTogcC5waG9uZSA/PyB1bmRlZmluZWQsIGVtYWlsOiBwLmVtYWlsID8/IHVuZGVmaW5lZCB9LFxuICAgICAgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgICB9KTtcbiAgICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IHNhbGVzX2FwcG9pbnRtZW50X2lkOiByLnNhbGVzQXBwb2ludG1lbnRJZCwgY2FsZW5kYXJfaWQ6IGNhbC5pZCwgc2NoZWR1bGVkX2F0OiByLnN0YXJ0c0F0IH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogJ3NhbGVzX2FwcG9pbnRtZW50JywgaWQ6IHIuc2FsZXNBcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgICBhZnRlckNoYW5nZSgpO1xuICAgIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGxzL2FwcG9pbnRtZW50cycpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5zYWxlc0FwcG9pbnRtZW50SWQsIHN0YXJ0c0F0OiByLnN0YXJ0c0F0IH07XG4gIH1cblxuICAvLyBSTFM6IHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdC5cbiAgY29uc3QgeyBkYXRhOiBsZWFkIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCcpLmVxKCdpZCcsIHBhcnR5SWQpLm1heWJlU2luZ2xlKCk7XG4gIGlmICghbGVhZCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0xlYWQgbm90IGZvdW5kLicgfTtcbiAgY29uc3QgciA9IGF3YWl0IGJvb2tBcHBvaW50bWVudCh7XG4gICAgY2FsZW5kYXJJZDogY2FsLmlkLCBzdGFydHNBdCwgbGVhZElkOiBsZWFkLmlkLCBzb3VyY2U6ICdtYW51YWwnLCBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgfSk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IGFwcG9pbnRtZW50X2lkOiByLmFwcG9pbnRtZW50SWQsIGNhbGVuZGFyX2lkOiBjYWwuaWQsIHNjaGVkdWxlZF9hdDogci5zdGFydHNBdCB9KTtcbiAgbm90aWZ5Qm9va2luZ1Nvb24oeyBraW5kOiAnYXBwb2ludG1lbnQnLCBpZDogci5hcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UobGVhZC5pZCk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5hcHBvaW50bWVudElkLCBzdGFydHNBdDogci5zdGFydHNBdCB9O1xufVxuXG5jb25zdCBjaGFuZ2VJbnB1dCA9IHoub2JqZWN0KHsga2luZDogei5lbnVtKFsnYXBwb2ludG1lbnQnLCAndmlzaXQnLCAnc2FsZXNfYXBwb2ludG1lbnQnXSksIGlkOiB1dWlkIH0pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzY2hlZHVsZUNhbGVuZGFyRXZlbnQoaW5wdXQ6IHsga2luZDogRXZlbnRLaW5kSW5wdXQ7IGlkOiBzdHJpbmc7IHN0YXJ0c0F0OiBzdHJpbmc7IG92ZXJyaWRlPzogYm9vbGVhbiB9KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXJ0c0F0OiBpc28sIG92ZXJyaWRlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpIH0pLnNhZmVQYXJzZShpbnB1dCk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgdmFsaWQgdGltZScgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFyZWYuY2FsZW5kYXIpIHJldHVybiBmYWlsZWQoJ25vdF9ib29rYWJsZScpO1xuICBjb25zdCBvdmVycmlkZSA9ICEhcGFyc2VkLmRhdGEub3ZlcnJpZGUgJiYgY2FuT3ZlcnJpZGVTbG90cyhjdHgudmlld2VyKTtcbiAgY29uc3Qgb3B0cyA9IHsgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIGFjdG9yS2luZDogJ3VzZXInIGFzIGNvbnN0LCBvdmVycmlkZSB9O1xuICBjb25zdCByID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCdcbiAgICA/IGF3YWl0IHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcGFyc2VkLmRhdGEuc3RhcnRzQXQsIG9wdHMpXG4gICAgOiBhd2FpdCByZXNjaGVkdWxlQXBwb2ludG1lbnQocmVmLmlkLCBwYXJzZWQuZGF0YS5zdGFydHNBdCwgb3B0cyk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgY29uc3Qgc3RhcnRzQXQgPSByLnN0YXJ0c0F0ID8/IG5ldyBEYXRlKHBhcnNlZC5kYXRhLnN0YXJ0c0F0KS50b0lTT1N0cmluZygpO1xuICBpZiAoIXIudW5jaGFuZ2VkKSB7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IFtgJHtyZWYua2luZH1faWRgXTogcmVmLmlkLCBjYWxlbmRhcl9pZDogcmVmLmNhbGVuZGFyLmlkLCBzY2hlZHVsZWRfYXQ6IHN0YXJ0c0F0LCByZXNjaGVkdWxlOiB0cnVlIH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogcmVmLmtpbmQsIGlkOiByZWYuaWQsIGNoYW5nZTogJ3Jlc2NoZWR1bGVkJywgcHJldmlvdXNTdGFydHNBdDogci5wcmV2aW91c1N0YXJ0c0F0ID8/IHJlZi5zY2hlZHVsZWRBdCwgYWN0b3JLaW5kOiAndXNlcicgfSk7XG4gIH1cbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBzdGFydHNBdCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FuY2VsQ2FsZW5kYXJFdmVudChpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBjaGFuZ2VJbnB1dC5leHRlbmQoeyByZWFzb246IHouc3RyaW5nKCkudHJpbSgpLm1heCg1MDApLm9wdGlvbmFsKCkgfSkuc2FmZVBhcnNlKGlucHV0KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0NoZWNrIHRoZSBjYW5jZWxsYXRpb24nIH07XG4gIGNvbnN0IHJlZiA9IGF3YWl0IHdvcmthYmxlQm9va2luZyhjdHgsIHBhcnNlZC5kYXRhLmtpbmQsIHBhcnNlZC5kYXRhLmlkKTtcbiAgaWYgKCFyZWYpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHJlYXNvbiA9IHBhcnNlZC5kYXRhLnJlYXNvbiB8fCBudWxsO1xuICBjb25zdCBvcHRzID0geyBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicgYXMgY29uc3QgfTtcbiAgY29uc3QgciA9IHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnXG4gICAgPyBhd2FpdCBjYW5jZWxTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcmVhc29uLCBvcHRzKVxuICAgIDogYXdhaXQgY2FuY2VsQXBwb2ludG1lbnQocmVmLmlkLCByZWFzb24sIG9wdHMpO1xuICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gIC8vIENhbGVuZGFyIGJvb2tpbmdzIHRlbGwgdGhlIGhvbWVvd25lciAvIHByb3NwZWN0OyBhbiBvbi1zaXRlIHZpc2l0J3Mgbm90aWNlcyBzdGF5IHdpdGggaXRzIHdvcmtmbG93cy5cbiAgaWYgKCFyLmFscmVhZHkgJiYgcmVmLmNhbGVuZGFyKSBub3RpZnlCb29raW5nU29vbih7IGtpbmQ6IHJlZi5raW5kLCBpZDogcmVmLmlkLCBjaGFuZ2U6ICdjYW5jZWxsZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlIH07XG59XG5cbmNvbnN0IFNUQVRVU19GT1I6IFJlY29yZDwnYXBwb2ludG1lbnQnIHwgJ3NhbGVzX2FwcG9pbnRtZW50Jywgc3RyaW5nW10+ID0ge1xuICBhcHBvaW50bWVudDogWydoZWxkJywgJ25vX3Nob3cnLCAnc2NoZWR1bGVkJ10sXG4gIHNhbGVzX2FwcG9pbnRtZW50OiBbJ2NvbXBsZXRlZCcsICdub19zaG93JywgJ3NjaGVkdWxlZCddLFxufTtcblxuLyoqIEhlbGQgLyBuby1zaG93IChhbmQgYmFjayB0byBzY2hlZHVsZWQgdG8gdW5kbykuIENhbmNlbGxpbmcgZ29lcyB0aHJvdWdoIGNhbmNlbENhbGVuZGFyRXZlbnQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q2FsZW5kYXJFdmVudFN0YXR1cyhpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgc3RhdHVzOiBzdHJpbmcgfSk6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXR1czogei5zdHJpbmcoKSB9KS5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnUGljayBhIHN0YXR1cycgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgY29uc3Qgc3RhdHVzID0gcGFyc2VkLmRhdGEuc3RhdHVzO1xuICBpZiAoIVNUQVRVU19GT1JbcmVmLmtpbmRdLmluY2x1ZGVzKHN0YXR1cykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgc3RhdHVzJyB9O1xuICBpZiAocmVmLnN0YXR1cyA9PT0gJ2NhbmNlbGxlZCcpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdBIGNhbmNlbGxlZCBjYWxsIGNhbm5vdCBiZSBtYXJrZWQuIEJvb2sgYSBuZXcgb25lIGluc3RlYWQuJyB9O1xuXG4gIC8vIFRoZSB1c2VyJ3Mgb3duIGNsaWVudDogdGhlIGV4aXN0aW5nIFJMUyB3cml0ZSBydWxlcyBkZWNpZGUgKGUuZy4gYSBzZXR0ZXIgZWRpdHMgb25seSBzYWxlcyBtZWV0aW5ncyB0aGV5IGJvb2tlZCkuXG4gIGNvbnN0IHRhYmxlID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCcgPyAncHJvc3BlY3Rfc2FsZXNfYXBwb2ludG1lbnRzJyA6ICdhcHBvaW50bWVudHMnO1xuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20odGFibGUpLnVwZGF0ZSh7IHN0YXR1cyB9KS5lcSgnaWQnLCByZWYuaWQpLnNlbGVjdCgnaWQnKTtcbiAgaWYgKGVycm9yIHx8ICEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiByZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JyA/ICdPbmx5IGFuIGFkbWluIG9yIHRoZSBzZXR0ZXIgd2hvIGJvb2tlZCB0aGlzIG1lZXRpbmcgY2FuIGNoYW5nZSBpdC4nIDogJ1RoaXMgYXBwb2ludG1lbnQgY291bGQgbm90IGJlIHVwZGF0ZWQuJyB9O1xuICB9XG5cbiAgaWYgKHJlZi5raW5kID09PSAnYXBwb2ludG1lbnQnICYmIHJlZi5sZWFkSWQgJiYgc3RhdHVzID09PSAnaGVsZCcpIHtcbiAgICAvLyBBIGhlbGQgY2FsbCB3aXRoIHRoZSBIb21lUXVvdGUgdGVhbSBpcyBub3QgdGhlIGNvbnRyYWN0b3IgYXBwb2ludG1lbnQ6IHRoZSBsZWFkJ3Mgc3RhZ2Ugc3RheXMgd2hlcmUgaXQgaXMuXG4gICAgY29uc3QgdGVhbUNhbGwgPSByZWYuY2FsZW5kYXI/LmtpbmQgPT09ICd0ZWFtJztcbiAgICBpZiAoIXRlYW1DYWxsKSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykudXBkYXRlKHsgc3RhdHVzOiAnYXBwb2ludG1lbnRfY29tcGxldGVkJyB9KS5lcSgnaWQnLCByZWYubGVhZElkKTtcbiAgICBjb25zdCBjb250cmFjdG9ySWQgPSByZWYuY2FsZW5kYXI/LmNvbnRyYWN0b3JJZCA/PyByZWYudmlzaXRDb250cmFjdG9ySWQ7XG4gICAgYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCdsZWFkX2FjdGl2aXRpZXMnKS5pbnNlcnQoe1xuICAgICAgbGVhZF9pZDogcmVmLmxlYWRJZCwgYWN0b3JfaWQ6IGN0eC5wcm9maWxlLmlkLCB0eXBlOiAnYXBwb2ludG1lbnQnLCBib2R5OiB0ZWFtQ2FsbCA/ICdDYWxsIHdpdGggdGhlIEhvbWVRdW90ZSB0ZWFtIGhlbGQnIDogJ0FwcG9pbnRtZW50IGNvbXBsZXRlZCcsXG4gICAgICAvLyBDb250cmFjdG9yLWF1dGhvcmVkIGVudHJpZXMgbXVzdCBuYW1lIHRoZWlyIG93biBjb21wYW55IChhY3Rpdml0aWVzX2luc2VydCBSTFMpLlxuICAgICAgbWV0YWRhdGE6IHsgYXBwb2ludG1lbnRfaWQ6IHJlZi5pZCwgLi4uKGNvbnRyYWN0b3JJZCA/IHsgY29udHJhY3Rvcl9pZDogY29udHJhY3RvcklkIH0gOiB7fSkgfSxcbiAgICB9KTtcbiAgfVxuICBhZnRlckNoYW5nZShyZWYubGVhZElkKTtcbiAgaWYgKHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSByZXZhbGlkYXRlUGF0aCgnL2FwcC9jYWxscy9hcHBvaW50bWVudHMnKTtcbiAgcmV0dXJuIHsgb2s6IHRydWUgfTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBDYWxlbmRhciBzZXR0aW5ncyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQ6IHN0cmluZyk6IFByb21pc2U8eyBjdHg6IEN0eDsgY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciB9IHwgeyBlcnJvcjogc3RyaW5nIH0+IHtcbiAgY29uc3QgY3R4ID0gYXdhaXQgY29udGV4dCgpO1xuICBpZiAoIWN0eCkgcmV0dXJuIHsgZXJyb3I6IGRlbmllZC5lcnJvciB9O1xuICBjb25zdCBjYWxlbmRhciA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBjYWxlbmRhcklkKTtcbiAgaWYgKCFjYWxlbmRhcikgcmV0dXJuIHsgZXJyb3I6ICdDYWxlbmRhciBub3QgZm91bmQnIH07XG4gIGlmICghY2FuTWFuYWdlQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsZW5kYXIpKSByZXR1cm4geyBlcnJvcjogJ09ubHkgYSBIb21lUXVvdGUgYWRtaW4gb3IgdGhlIGNvbXBhbnkgb3duZXIgY2FuIGNoYW5nZSB0aGlzIGNhbGVuZGFyLicgfTtcbiAgcmV0dXJuIHsgY3R4LCBjYWxlbmRhciB9O1xufVxuXG5jb25zdCBmaWVsZCA9IChmOiBGb3JtRGF0YSwgazogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHYgPSBmLmdldChrKTtcbiAgcmV0dXJuIHYgPT09IG51bGwgPyBudWxsIDogU3RyaW5nKHYpLnRyaW0oKTtcbn07XG5jb25zdCBpbnRGaWVsZCA9IChsbzogbnVtYmVyLCBoaTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpID0+IHouY29lcmNlLm51bWJlcih7IGludmFsaWRfdHlwZV9lcnJvcjogbWVzc2FnZSB9KS5pbnQobWVzc2FnZSkubWluKGxvLCBtZXNzYWdlKS5tYXgoaGksIG1lc3NhZ2UpO1xuXG5jb25zdCBzZXR0aW5nc1NjaGVtYSA9IHpcbiAgLm9iamVjdCh7XG4gICAgbmFtZTogei5zdHJpbmcoKS5taW4oMSwgJ0dpdmUgdGhlIGNhbGVuZGFyIGEgbmFtZScpLm1heCgxMjAsICdVc2UgMTIwIGNoYXJhY3RlcnMgb3IgZmV3ZXInKSxcbiAgICB0aW1lem9uZTogei5zdHJpbmcoKS5yZWZpbmUoaXNWYWxpZFRpbWVab25lLCAnUGljayBhIHZhbGlkIHRpbWUgem9uZScpLFxuICAgIGR1cmF0aW9uX21pbnV0ZXM6IGludEZpZWxkKDEwLCAyNDAsICdDYWxsIGxlbmd0aCBtdXN0IGJlIDEw4oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogaW50RmllbGQoNSwgMjQwLCAnU3RhcnQgdGltZXMgbXVzdCBiZSBldmVyeSA14oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBidWZmZXJfbWludXRlczogaW50RmllbGQoMCwgMjQwLCAnQnVmZmVyIG11c3QgYmUgMOKAkzI0MCBtaW51dGVzJyksXG4gICAgbWluX25vdGljZV9taW51dGVzOiBpbnRGaWVsZCgwLCA0MzIwMCwgJ01pbmltdW0gbm90aWNlIG11c3QgYmUgMOKAkzcyMCBob3VycycpLFxuICAgIGhvcml6b25fZGF5czogaW50RmllbGQoMSwgMTIwLCAnQm9vayBhaGVhZCBtdXN0IGJlIDHigJMxMjAgZGF5cycpLFxuICAgIG1heF9wZXJfZGF5OiBpbnRGaWVsZCgxLCAxMDAsICdNYXggcGVyIGRheSBtdXN0IGJlIDHigJMxMDAnKS5udWxsYWJsZSgpLFxuICAgIG1lZXRpbmdfdHlwZTogei5lbnVtKFsncGhvbmUnLCAndmlkZW8nXSksXG4gICAgdmlkZW9fbGluazogei5zdHJpbmcoKS5tYXgoNTAwKS5yZWdleCgvXmh0dHBzOlxcL1xcLy8sICdUaGUgdmlkZW8gbGluayBtdXN0IHN0YXJ0IHdpdGggaHR0cHM6Ly8nKS5udWxsYWJsZSgpLFxuICAgIGFjdGl2ZTogei5ib29sZWFuKCksXG4gIH0pXG4gIC5yZWZpbmUoKHMpID0+IHMubWVldGluZ190eXBlICE9PSAndmlkZW8nIHx8ICEhcy52aWRlb19saW5rLCB7IG1lc3NhZ2U6ICdBZGQgdGhlIHZpZGVvIGxpbmsgY2FsbGVycyB3aWxsIGpvaW4nLCBwYXRoOiBbJ3ZpZGVvX2xpbmsnXSB9KTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJTZXR0aW5ncyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgY29uc3Qgbm90aWNlID0gZmllbGQoZm9ybURhdGEsICdtaW5fbm90aWNlX2hvdXJzJyk7XG4gIGNvbnN0IHBhcnNlZCA9IHNldHRpbmdzU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgbmFtZTogZmllbGQoZm9ybURhdGEsICduYW1lJyksXG4gICAgdGltZXpvbmU6IGZpZWxkKGZvcm1EYXRhLCAndGltZXpvbmUnKSxcbiAgICBkdXJhdGlvbl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2R1cmF0aW9uX21pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogZmllbGQoZm9ybURhdGEsICdzbG90X3N0ZXBfbWludXRlcycpLFxuICAgIGJ1ZmZlcl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2J1ZmZlcl9taW51dGVzJykgfHwgMCxcbiAgICBtaW5fbm90aWNlX21pbnV0ZXM6IG5vdGljZSA/IE1hdGgucm91bmQoTnVtYmVyKG5vdGljZSkgKiA2MCkgOiAwLFxuICAgIGhvcml6b25fZGF5czogZmllbGQoZm9ybURhdGEsICdob3Jpem9uX2RheXMnKSxcbiAgICBtYXhfcGVyX2RheTogZmllbGQoZm9ybURhdGEsICdtYXhfcGVyX2RheScpIHx8IG51bGwsXG4gICAgbWVldGluZ190eXBlOiBmaWVsZChmb3JtRGF0YSwgJ21lZXRpbmdfdHlwZScpLFxuICAgIHZpZGVvX2xpbms6IGZpZWxkKGZvcm1EYXRhLCAndmlkZW9fbGluaycpIHx8IG51bGwsXG4gICAgYWN0aXZlOiBmb3JtRGF0YS5nZXQoJ2FjdGl2ZScpID09PSAnb24nLFxuICB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgZXJyb3I6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgPz8gJ0NoZWNrIHRoZSBzZXR0aW5ncycgfTtcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJzJykudXBkYXRlKHBhcnNlZC5kYXRhKS5lcSgnaWQnLCBtLmNhbGVuZGFyLmlkKS5zZWxlY3QoJ2lkJyk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgaWYgKCEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHJldHVybiB7IGVycm9yOiAnWW91IGNhbuKAmXQgY2hhbmdlIHRoaXMgY2FsZW5kYXIuJyB9O1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbiAgcmV0dXJuIHsgc3VjY2VzczogJ1NldHRpbmdzIHNhdmVkJyB9O1xufVxuXG5jb25zdCBydWxlU2NoZW1hID0gelxuICAub2JqZWN0KHsgd2Vla2RheTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDYpLCBzdGFydE1pbnV0ZTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDE0MzkpLCBlbmRNaW51dGU6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgxNDQwKSB9KVxuICAucmVmaW5lKChyKSA9PiByLmVuZE1pbnV0ZSA+IHIuc3RhcnRNaW51dGUsICdFbmQgdGltZSBtdXN0IGJlIGFmdGVyIHN0YXJ0IHRpbWUnKTtcblxuLyoqIFJlcGxhY2UgdGhlIGNhbGVuZGFyJ3Mgd2Vla2x5IGhvdXJzIChXZWVrbHlFZGl0b3IncyBgcnVsZXNgIEpTT04pLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJSdWxlcyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgbGV0IHJhdzogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICByYXcgPSBKU09OLnBhcnNlKFN0cmluZyhmb3JtRGF0YS5nZXQoJ3J1bGVzJykgPz8gJ1tdJykpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIHRoZSBob3VycycgfTtcbiAgfVxuICBjb25zdCBwYXJzZWQgPSB6LmFycmF5KHJ1bGVTY2hlbWEpLm1heCg1MCkuc2FmZVBhcnNlKHJhdyk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgaG91cnMnIH07XG4gIGNvbnN0IHJ1bGVzID0gcGFyc2VkLmRhdGE7XG4gIGZvciAobGV0IGQgPSAwOyBkIDwgNzsgZCsrKSB7XG4gICAgY29uc3QgZGF5ID0gcnVsZXMuZmlsdGVyKChyKSA9PiByLndlZWtkYXkgPT09IGQpLnNvcnQoKGEsIGIpID0+IGEuc3RhcnRNaW51dGUgLSBiLnN0YXJ0TWludXRlKTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGRheS5sZW5ndGg7IGkrKykgaWYgKGRheVtpXS5zdGFydE1pbnV0ZSA8IGRheVtpIC0gMV0uZW5kTWludXRlKSByZXR1cm4geyBlcnJvcjogJ0hvdXJzIG9uIHRoZSBzYW1lIGRheSBvdmVybGFwJyB9O1xuICB9XG4gIGNvbnN0IGRiID0gbS5jdHgudXNlckRiO1xuICBjb25zdCB7IGVycm9yOiBkZWxFcnJvciB9ID0gYXdhaXQgZGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcl9ydWxlcycpLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpO1xuICBpZiAoZGVsRXJyb3IpIHJldHVybiB7IGVycm9yOiBkZWxFcnJvci5tZXNzYWdlIH07XG4gIGlmIChydWxlcy5sZW5ndGgpIHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBkYi5mcm9tKCdib29raW5nX2NhbGVuZGFyX3J1bGVzJykuaW5zZXJ0KFxuICAgICAgcnVsZXMubWFwKChyKSA9PiAoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgd2Vla2RheTogci53ZWVrZGF5LCBzdGFydF9taW51dGU6IHIuc3RhcnRNaW51dGUsIGVuZF9taW51dGU6IHIuZW5kTWludXRlIH0pKVxuICAgICk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4geyBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG4gIHJlZnJlc2hDYWxlbmRhcigpO1xuICByZXR1cm4geyBzdWNjZXNzOiBydWxlcy5sZW5ndGggPyAnSG91cnMgc2F2ZWQnIDogJ0hvdXJzIGNsZWFyZWQ6IG5vdGhpbmcgY2FuIGJlIGJvb2tlZCB1bnRpbCB5b3UgYWRkIHNvbWUnIH07XG59XG5cbi8qKiBQZW9wbGUgd2hvIG1heSBob3N0IGEgY2FsZW5kYXI6IHRlYW0gLyBzYWxlcyB0YWtlIEhvbWVRdW90ZSBhZG1pbnMgKyBzZXR0ZXJzOyBhIGNvbnRyYWN0b3IgY2FsZW5kYXIgaXRzIG93biBjb21wYW55J3MgdXNlcnMuICovXG5hc3luYyBmdW5jdGlvbiBlbGlnaWJsZUhvc3QoY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciwgdXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjcmVhdGVBZG1pbkNsaWVudCgpLmZyb20oJ3Byb2ZpbGVzJykuc2VsZWN0KCdpZCwgcm9sZSwgY29udHJhY3Rvcl9pZCwgaXNfYWN0aXZlJykuZXEoJ2lkJywgdXNlcklkKS5tYXliZVNpbmdsZSgpO1xuICBpZiAoIXAgfHwgcC5pc19hY3RpdmUgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBjYWxlbmRhci5raW5kID09PSAnY29udHJhY3RvcicgPyBwLnJvbGUgPT09ICdjb250cmFjdG9yJyAmJiBwLmNvbnRyYWN0b3JfaWQgPT09IGNhbGVuZGFyLmNvbnRyYWN0b3JJZCA6IHAucm9sZSA9PT0gJ2FkbWluJyB8fCBwLnJvbGUgPT09ICdzZXR0ZXInO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQm9va2luZ0NhbGVuZGFyTWVtYmVyKGNhbGVuZGFySWQ6IHN0cmluZywgX3ByZXY6IFNldHRpbmdzU3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8U2V0dGluZ3NTdGF0ZT4ge1xuICBjb25zdCBtID0gYXdhaXQgbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQpO1xuICBpZiAoJ2Vycm9yJyBpbiBtKSByZXR1cm4geyBlcnJvcjogbS5lcnJvciB9O1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZSh1c2VySWQpLnN1Y2Nlc3MgfHwgIShhd2FpdCBlbGlnaWJsZUhvc3QobS5jYWxlbmRhciwgdXNlcklkKSkpIHJldHVybiB7IGVycm9yOiAnUGljayBhIHBlcnNvbiB0byBhZGQnIH07XG4gIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IG0uY3R4LnVzZXJEYlxuICAgIC5mcm9tKCdib29raW5nX2NhbGVuZGFyX21lbWJlcnMnKVxuICAgIC51cHNlcnQoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgdXNlcl9pZDogdXNlcklkLCBub3RpZnk6IHRydWUgfSwgeyBvbkNvbmZsaWN0OiAnY2FsZW5kYXJfaWQsdXNlcl9pZCcgfSk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgcmVmcmVzaENhbGVuZGFyKCk7XG4gIHJldHVybiB7IHN1Y2Nlc3M6ICdIb3N0IGFkZGVkJyB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va2luZ0NhbGVuZGFyTWVtYmVyKGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjYWxlbmRhcklkID0gZmllbGQoZm9ybURhdGEsICdjYWxlbmRhcl9pZCcpID8/ICcnO1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgY29uc3Qgb3AgPSBmaWVsZChmb3JtRGF0YSwgJ29wJyk7XG4gIGNvbnN0IG0gPSBhd2FpdCBtYW5hZ2VhYmxlQ2FsZW5kYXIoY2FsZW5kYXJJZCk7XG4gIGlmICgnZXJyb3InIGluIG0gfHwgIXV1aWQuc2FmZVBhcnNlKHVzZXJJZCkuc3VjY2VzcykgcmV0dXJuO1xuICBjb25zdCBtZW1iZXJzID0gbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJfbWVtYmVycycpO1xuICBpZiAob3AgPT09ICdyZW1vdmUnKSBhd2FpdCBtZW1iZXJzLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpLmVxKCd1c2VyX2lkJywgdXNlcklkKTtcbiAgZWxzZSBpZiAob3AgPT09ICdub3RpZnlfb24nIHx8IG9wID09PSAnbm90aWZ5X29mZicpIGF3YWl0IG1lbWJlcnMudXBkYXRlKHsgbm90aWZ5OiBvcCA9PT0gJ25vdGlmeV9vbicgfSkuZXEoJ2NhbGVuZGFyX2lkJywgbS5jYWxlbmRhci5pZCkuZXEoJ3VzZXJfaWQnLCB1c2VySWQpO1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOFJBMk1zQiJ9
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calls/format.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Display helpers for the calling workspace. Dates render in the caller's
 * zone (Los Angeles by default) because a callback "at 2 PM" means the
 * contractor's 2 PM, not the server's.
 */ __turbopack_context__.s([
    "DEFAULT_TZ",
    ()=>DEFAULT_TZ,
    "fmtDate",
    ()=>fmtDate,
    "fmtDateTime",
    ()=>fmtDateTime,
    "fmtPhone",
    ()=>fmtPhone,
    "fmtRelative",
    ()=>fmtRelative,
    "isDue",
    ()=>isDue,
    "siteHref",
    ()=>siteHref,
    "siteLabel",
    ()=>siteLabel,
    "telHref",
    ()=>telHref
]);
const DEFAULT_TZ = 'America/Los_Angeles';
function fmtDateTime(iso, timeZone = DEFAULT_TZ) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(d);
}
function fmtDate(iso, timeZone = DEFAULT_TZ) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(d);
}
function fmtRelative(iso, now = Date.now()) {
    if (!iso) return 'Never';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '—';
    const diff = Math.max(0, now - t);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return fmtDate(iso);
}
function fmtPhone(phone) {
    if (!phone) return '—';
    const d = phone.replace(/\D/g, '');
    const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
    if (ten.length !== 10) return phone;
    return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}
function telHref(phone) {
    if (!phone) return null;
    const d = phone.replace(/\D/g, '');
    if (d.length < 10) return null;
    return `tel:+${d.length === 10 ? '1' + d : d}`;
}
function siteLabel(website) {
    if (!website) return '—';
    return website.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');
}
function siteHref(website) {
    if (!website) return null;
    return /^[a-z]+:\/\//i.test(website) ? website : `https://${website}`;
}
function isDue(iso, now = Date.now()) {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t <= now;
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
"[project]/components/calendar/panel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CalendarPanel",
    ()=>CalendarPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-dialog/dist/index.mjs [app-client] (ecmascript) <export * as Dialog>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
'use client';
;
;
;
function CalendarPanel({ open, onOpenChange, title, description, children, footer }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Root, {
        open: open,
        onOpenChange: onOpenChange,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Portal, {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Overlay, {
                    className: "fixed inset-0 z-[60] bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none"
                }, void 0, false, {
                    fileName: "[project]/components/calendar/panel.tsx",
                    lineNumber: 30,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Content, {
                    className: "fixed inset-x-0 bottom-0 z-[60] flex max-h-[92dvh] flex-col rounded-t-2xl border-t bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-none md:border-l md:border-t-0 md:data-[state=open]:slide-in-from-right",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30 md:hidden",
                            "aria-hidden": "true"
                        }, void 0, false, {
                            fileName: "[project]/components/calendar/panel.tsx",
                            lineNumber: 34,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-start justify-between gap-3 px-5 pb-2 pt-3 md:pt-5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "min-w-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Title, {
                                            className: "text-lg font-semibold tracking-tight",
                                            children: title
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/panel.tsx",
                                            lineNumber: 37,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Description, {
                                            className: description ? 'mt-0.5 text-sm text-muted-foreground' : 'sr-only',
                                            children: description ?? title
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/panel.tsx",
                                            lineNumber: 38,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calendar/panel.tsx",
                                    lineNumber: 36,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Close, {
                                    className: "-mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                    "aria-label": "Close",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "size-5"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/panel.tsx",
                                        lineNumber: 46,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/calendar/panel.tsx",
                                    lineNumber: 42,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/calendar/panel.tsx",
                            lineNumber: 35,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5",
                            children: children
                        }, void 0, false, {
                            fileName: "[project]/components/calendar/panel.tsx",
                            lineNumber: 49,
                            columnNumber: 11
                        }, this),
                        footer ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "border-t px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
                            children: footer
                        }, void 0, false, {
                            fileName: "[project]/components/calendar/panel.tsx",
                            lineNumber: 50,
                            columnNumber: 21
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/calendar/panel.tsx",
                    lineNumber: 31,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/calendar/panel.tsx",
            lineNumber: 29,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/calendar/panel.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, this);
}
_c = CalendarPanel;
var _c;
__turbopack_context__.k.register(_c, "CalendarPanel");
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
"[project]/components/booking/zone-label.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Pure time-zone labels for the booking UI (no React, no 'use client'), so
 * server components such as the in-app Calendar page can call them too.
 * components/booking/zone.ts re-exports them for the client components.
 */ __turbopack_context__.s([
    "sameClock",
    ()=>sameClock,
    "zoneCity",
    ()=>zoneCity,
    "zoneLabel",
    ()=>zoneLabel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
;
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
"[project]/components/booking/zone.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useViewerTimeZone",
    ()=>useViewerTimeZone
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
// Pure zone helpers live in ./zone-label (no 'use client'), so server components can call them too.
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2d$label$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/zone-label.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
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
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/booking/zone.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2d$label$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/zone-label.ts [app-client] (ecmascript)");
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
    const switchTo = zoneChoices.find((z)=>z !== timeZone && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2d$label$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sameClock"])(z, timeZone, firstMs)) ?? null;
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
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2d$label$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zoneLabel"])(firstMs, timeZone),
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
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2d$label$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zoneCity"])(switchTo),
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
"[project]/lib/actions/data:70861c [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"409f3155610f508c7e0199e3539e9b7b63aad2e8c2":"getCalendarSlots"},"lib/actions/booking.ts",""] */ __turbopack_context__.s([
    "getCalendarSlots",
    ()=>getCalendarSlots
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var getCalendarSlots = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("409f3155610f508c7e0199e3539e9b7b63aad2e8c2", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "getCalendarSlots"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYm9va2luZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcic7XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgLS0gcm93cyBjb21lIGZyb20gdGhlIHVudHlwZWQgU3VwYWJhc2UgY2xpZW50LCBhcyBlbHNld2hlcmUgaW4gbGliL2RhdGEgKi9cbmltcG9ydCB7IHJldmFsaWRhdGVQYXRoIH0gZnJvbSAnbmV4dC9jYWNoZSc7XG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcbmltcG9ydCB7IHJlcXVpcmVQcm9maWxlIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9zZXJ2ZXInO1xuaW1wb3J0IHsgY3JlYXRlQWRtaW5DbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9hZG1pbic7XG5pbXBvcnQgeyBnZXRTbG90cyB9IGZyb20gJ0AvbGliL2Jvb2tpbmcvc2xvdHMuc2VydmVyJztcbmltcG9ydCB7XG4gIGJvb2tBcHBvaW50bWVudCxcbiAgYm9va1NhbGVzQXBwb2ludG1lbnQsXG4gIGNhbmNlbEFwcG9pbnRtZW50LFxuICBjYW5jZWxTYWxlc0FwcG9pbnRtZW50LFxuICByZXNjaGVkdWxlQXBwb2ludG1lbnQsXG4gIHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50LFxufSBmcm9tICdAL2xpYi9ib29raW5nL2Jvb2suc2VydmVyJztcbmltcG9ydCB7IG5vdGlmeUJvb2tpbmdTb29uIH0gZnJvbSAnQC9saWIvYm9va2luZy9ub3RpZnkuc2VydmVyJztcbmltcG9ydCB7IEJPT0tJTkdfRVJST1JfTUVTU0FHRVMsIG1hcENhbGVuZGFyLCBQSUNLX0FOT1RIRVJfVElNRSwgdHlwZSBCb29raW5nQ2FsZW5kYXIsIHR5cGUgQm9va2luZ0Vycm9yIH0gZnJvbSAnQC9saWIvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgeyBpc1ZhbGlkVGltZVpvbmUgfSBmcm9tICdAL2xpYi9hdmFpbGFiaWxpdHkvdGltZSc7XG5pbXBvcnQgeyBmbHVzaE5vdGlmaWNhdGlvbnNTb29uIH0gZnJvbSAnQC9saWIvbm90aWZpY2F0aW9ucy9vdXRib3gnO1xuaW1wb3J0IHsgZmx1c2hDYWxlbmRhclN5bmNTb29uIH0gZnJvbSAnQC9saWIvY2FsZW5kYXIvc3luYy5zZXJ2ZXInO1xuaW1wb3J0IHsgY2FuTWFuYWdlQ2FsZW5kYXIsIGNhbk92ZXJyaWRlU2xvdHMsIGNhblVzZUNhbGVuZGFyUGFnZSwgY2FuV29ya0NhbGVuZGFyLCB0eXBlIENhbGVuZGFyVmlld2VyIH0gZnJvbSAnQC9jb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcyc7XG5pbXBvcnQgdHlwZSB7IFB1YmxpY1Nsb3QgfSBmcm9tICdAL2NvbXBvbmVudHMvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IFByb2ZpbGUgfSBmcm9tICdAL2xpYi90eXBlcyc7XG5cbi8qKlxuICogSW4tYXBwIGNhbGVuZGFyIGFjdGlvbnMgKGFwcC9hcHAvY2FsZW5kYXIpOiBzbG90cyBmb3IgdGhlIHBpY2tlciwgYm9vayBhXG4gKiBjYWxsIG9uIHNvbWVvbmUncyBiZWhhbGYsIHJlc2NoZWR1bGUsIGNhbmNlbCwgaGVsZCAvIG5vLXNob3csIGFuZCB0aGVcbiAqIGJvb2tpbmctY2FsZW5kYXIgc2V0dGluZ3MuXG4gKlxuICogRXZlcnkgYWN0aW9uIGZpcnN0IHJlYWRzIHRoZSBjYWxlbmRhciAvIGJvb2tpbmcgLyBsZWFkIHRocm91Z2ggdGhlXG4gKiBzaWduZWQtaW4gdXNlcidzIE9XTiBjbGllbnQsIHNvIFJMUyAoMDA2OCkgZGVjaWRlcyB3aGV0aGVyIHRoZXkgbWF5IHNlZSBpdCxcbiAqIHRoZW4gYXBwbGllcyB0aGUgcm9sZSBydWxlcyBpbiBjb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcy50cyAoYSBjb250cmFjdG9yXG4gKiB3b3JrcyBvbmx5IGl0cyBvd24gY2FsZW5kYXIpLiBPbmx5IHRoZW4gZG9lcyB0aGUgc2VydmljZS1yb2xlIGJvb2tpbmcgUlBDXG4gKiBydW4sIHdoaWNoIHJlLWNoZWNrcyB0aGUgc2xvdCB1bmRlciB0aGUgY2FsZW5kYXIgbG9jay4gU3RhdHVzIGNoYW5nZXMgYW5kXG4gKiBzZXR0aW5ncyBzdGF5IG9uIHRoZSB1c2VyJ3MgY2xpZW50IChSTFMgd3JpdGUgcG9saWNpZXMgYXBwbHkgYXMgdGhleSBhcmUpLlxuICogSG9tZW93bmVyIC8gcHJvc3BlY3Qgbm90aWNlcyBnbyBvdXQgYWZ0ZXIgdGhlIHJlc3BvbnNlIChub3RpZnlCb29raW5nU29vbik7XG4gKiBwdXNoIGFuZCBHb29nbGUgc3luYyBjb21lIGZyb20gdGhlIERCIHRyaWdnZXJzIGFuZCBhcmUgZmx1c2hlZCBoZXJlLlxuICovXG5cbmV4cG9ydCB0eXBlIEFjdGlvblJlc3VsdDxUID0gb2JqZWN0PiA9ICh7IG9rOiB0cnVlIH0gJiBUKSB8IHsgb2s6IGZhbHNlOyBlcnJvcjogc3RyaW5nOyBwaWNrQW5vdGhlcj86IGJvb2xlYW4gfTtcbmV4cG9ydCB0eXBlIFNldHRpbmdzU3RhdGUgPSB7IGVycm9yPzogc3RyaW5nOyBzdWNjZXNzPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG5cbnR5cGUgRXZlbnRLaW5kSW5wdXQgPSAnYXBwb2ludG1lbnQnIHwgJ3Zpc2l0JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG5cbi8qKiBIb3N0LWZhY2luZyB3b3JkaW5nICh0aGUgaG9tZW93bmVyIG1lc3NhZ2VzIHNheSBcInlvdVwiOyBzdGFmZiBuZWVkIHRvIGtub3cgd2hhdCBoYXBwZW5lZCkuICovXG5jb25zdCBIT1NUX01FU1NBR0VTOiBQYXJ0aWFsPFJlY29yZDxCb29raW5nRXJyb3IsIHN0cmluZz4+ID0ge1xuICBhbHJlYWR5X2Jvb2tlZDogJ1RoaXMgbGVhZCBhbHJlYWR5IGhhcyBhIGNhbGwgYm9va2VkIGZyb20gdGhlIGZ1bm5lbC4nLFxuICBub3RfYm9va2FibGU6ICdUaGlzIGFwcG9pbnRtZW50IGlzIG5vdCBvbiBhIGJvb2tpbmcgY2FsZW5kYXIuIENoYW5nZSBpdCBmcm9tIHRoZSBsZWFkLicsXG4gIG5vdF9hY3RpdmU6ICdPbmx5IGEgc2NoZWR1bGVkIGNhbGwgY2FuIGJlIGNoYW5nZWQuJyxcbiAgbGVhZF9ub3RfZm91bmQ6ICdMZWFkIG5vdCBmb3VuZC4nLFxuICBhc3NpZ25tZW50X21pc21hdGNoOiAnVGhhdCBsZWFkIGlzIG5vdCBhc3NpZ25lZCB0byB0aGlzIGNvbnRyYWN0b3IuJyxcbiAgd3JvbmdfY2FsZW5kYXI6ICdUaGlzIGxlYWQgY2Fubm90IGJlIGJvb2tlZCBvbiB0aGF0IGNhbGVuZGFyLicsXG4gIGNhbGVuZGFyX2J1c3k6ICdBIGhvc3TigJlzIEdvb2dsZSBDYWxlbmRhciBpcyBidXN5IHRoZW4uIFBpY2sgYW5vdGhlciB0aW1lLicsXG59O1xuY29uc3QgbWVzc2FnZUZvciA9IChlOiBCb29raW5nRXJyb3IpID0+IEhPU1RfTUVTU0FHRVNbZV0gPz8gQk9PS0lOR19FUlJPUl9NRVNTQUdFU1tlXTtcbmNvbnN0IGZhaWxlZCA9IChlOiBCb29raW5nRXJyb3IpOiB7IG9rOiBmYWxzZTsgZXJyb3I6IHN0cmluZzsgcGlja0Fub3RoZXI/OiBib29sZWFuIH0gPT4gKHsgb2s6IGZhbHNlLCBlcnJvcjogbWVzc2FnZUZvcihlKSwgcGlja0Fub3RoZXI6IFBJQ0tfQU5PVEhFUl9USU1FLmhhcyhlKSB8fCB1bmRlZmluZWQgfSk7XG5jb25zdCBkZW5pZWQgPSB7IG9rOiBmYWxzZSBhcyBjb25zdCwgZXJyb3I6ICdZb3UgZG9u4oCZdCBoYXZlIGFjY2VzcyB0byB0aGlzIGNhbGVuZGFyLicgfTtcblxuY29uc3QgdXVpZCA9IHouc3RyaW5nKCkudXVpZCgpO1xuY29uc3QgaXNvID0gei5zdHJpbmcoKS5yZWZpbmUoKHYpID0+IE51bWJlci5pc0Zpbml0ZShEYXRlLnBhcnNlKHYpKSwgJ1BpY2sgYSB2YWxpZCB0aW1lJyk7XG5cbmludGVyZmFjZSBDdHgge1xuICBwcm9maWxlOiBQcm9maWxlO1xuICB2aWV3ZXI6IENhbGVuZGFyVmlld2VyO1xuICB1c2VyRGI6IGFueTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29udGV4dCgpOiBQcm9taXNlPEN0eCB8IG51bGw+IHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGNvbnN0IHZpZXdlcjogQ2FsZW5kYXJWaWV3ZXIgPSB7IGlkOiBwcm9maWxlLmlkLCByb2xlOiBwcm9maWxlLnJvbGUsIGNvbnRyYWN0b3JfaWQ6IHByb2ZpbGUuY29udHJhY3Rvcl9pZCwgY29udHJhY3Rvcl9yb2xlOiBwcm9maWxlLmNvbnRyYWN0b3Jfcm9sZSB9O1xuICBpZiAoIWNhblVzZUNhbGVuZGFyUGFnZSh2aWV3ZXIpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgcHJvZmlsZSwgdmlld2VyLCB1c2VyRGI6IGF3YWl0IGNyZWF0ZUNsaWVudCgpIH07XG59XG5cbi8qKiBUaGUgY2FsZW5kYXIsIHJlYWQgdGhyb3VnaCB0aGUgdXNlcidzIGNsaWVudCAoUkxTKSwgb3IgbnVsbC4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZpc2libGVDYWxlbmRhcih1c2VyRGI6IGFueSwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ0NhbGVuZGFyIHwgbnVsbD4ge1xuICBpZiAoIXV1aWQuc2FmZVBhcnNlKGlkKS5zdWNjZXNzKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCB1c2VyRGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcnMnKS5zZWxlY3QoJyonKS5lcSgnaWQnLCBpZCkubWF5YmVTaW5nbGUoKTtcbiAgcmV0dXJuIGRhdGEgPyBtYXBDYWxlbmRhcihkYXRhKSA6IG51bGw7XG59XG5cbmludGVyZmFjZSBCb29raW5nUmVmIHtcbiAga2luZDogJ2FwcG9pbnRtZW50JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG4gIGlkOiBzdHJpbmc7XG4gIGNhbGVuZGFyOiBCb29raW5nQ2FsZW5kYXIgfCBudWxsO1xuICAvKiogQ29udHJhY3RvciB0aGF0IG93bnMgYSB2aXNpdCAobm8gY2FsZW5kYXIpIHRocm91Z2ggaXRzIGFzc2lnbm1lbnQuICovXG4gIHZpc2l0Q29udHJhY3RvcklkOiBzdHJpbmcgfCBudWxsO1xuICBsZWFkSWQ6IHN0cmluZyB8IG51bGw7XG4gIHNjaGVkdWxlZEF0OiBzdHJpbmcgfCBudWxsO1xuICBzdGF0dXM6IHN0cmluZztcbn1cblxuLyoqIEEgYm9va2luZyB0aGUgdXNlciBjYW4gc2VlIChSTFMpICsgd2hldGhlciB0aGUgcm9sZSBydWxlcyBsZXQgdGhlbSB3b3JrIGl0LiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya2FibGVCb29raW5nKGN0eDogQ3R4LCBraW5kOiBFdmVudEtpbmRJbnB1dCwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ1JlZiB8IG51bGw+IHtcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZShpZCkuc3VjY2VzcykgcmV0dXJuIG51bGw7XG4gIGlmIChraW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ3Byb3NwZWN0X3NhbGVzX2FwcG9pbnRtZW50cycpLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cycpLmVxKCdpZCcsIGlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gICAgLy8gU2FsZXMgbWVldGluZ3MgYXJlIEhvbWVRdW90ZSdzIG93bjogbmV2ZXIgYSBjb250cmFjdG9yJ3MuXG4gICAgaWYgKGN0eC52aWV3ZXIucm9sZSAhPT0gJ2FkbWluJyAmJiBjdHgudmlld2VyLnJvbGUgIT09ICdzZXR0ZXInKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjYWxlbmRhciA9IGRhdGEuY2FsZW5kYXJfaWQgPyBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgZGF0YS5jYWxlbmRhcl9pZCkgOiBudWxsO1xuICAgIHJldHVybiB7IGtpbmQsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IG51bGwsIGxlYWRJZDogbnVsbCwgc2NoZWR1bGVkQXQ6IGRhdGEuc2NoZWR1bGVkX2F0LCBzdGF0dXM6IGRhdGEuc3RhdHVzIH07XG4gIH1cbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiXG4gICAgLmZyb20oJ2FwcG9pbnRtZW50cycpXG4gICAgLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBsZWFkX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cywgYXNzaWdubWVudDpsZWFkX2Fzc2lnbm1lbnRzKGNvbnRyYWN0b3JfaWQsIGxlYWRfaWQpJylcbiAgICAuZXEoJ2lkJywgaWQpXG4gICAgLm1heWJlU2luZ2xlKCk7XG4gIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGFzZyA9IEFycmF5LmlzQXJyYXkoZGF0YS5hc3NpZ25tZW50KSA/IGRhdGEuYXNzaWdubWVudFswXSA6IGRhdGEuYXNzaWdubWVudDtcbiAgY29uc3QgY2FsZW5kYXIgPSBkYXRhLmNhbGVuZGFyX2lkID8gYXdhaXQgdmlzaWJsZUNhbGVuZGFyKGN0eC51c2VyRGIsIGRhdGEuY2FsZW5kYXJfaWQpIDogbnVsbDtcbiAgY29uc3QgcmVmOiBCb29raW5nUmVmID0ge1xuICAgIGtpbmQ6ICdhcHBvaW50bWVudCcsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IGRhdGEuY2FsZW5kYXJfaWQgPyBudWxsIDogYXNnPy5jb250cmFjdG9yX2lkID8/IG51bGwsXG4gICAgbGVhZElkOiBkYXRhLmxlYWRfaWQgPz8gYXNnPy5sZWFkX2lkID8/IG51bGwsIHNjaGVkdWxlZEF0OiBkYXRhLnNjaGVkdWxlZF9hdCwgc3RhdHVzOiBkYXRhLnN0YXR1cyxcbiAgfTtcbiAgaWYgKGNhbGVuZGFyKSByZXR1cm4gY2FuV29ya0NhbGVuZGFyKGN0eC52aWV3ZXIsIGNhbGVuZGFyKSA/IHJlZiA6IG51bGw7XG4gIC8vIEEgdmlzaXQgd2l0aCBubyBjYWxlbmRhcjogc3RhZmYsIG9yIHRoZSBjb250cmFjdG9yIHdob3NlIGFzc2lnbm1lbnQgaXQgaXMuXG4gIGNvbnN0IHN0YWZmID0gY3R4LnZpZXdlci5yb2xlID09PSAnYWRtaW4nIHx8IGN0eC52aWV3ZXIucm9sZSA9PT0gJ3NldHRlcic7XG4gIHJldHVybiBzdGFmZiB8fCAocmVmLnZpc2l0Q29udHJhY3RvcklkICE9PSBudWxsICYmIHJlZi52aXNpdENvbnRyYWN0b3JJZCA9PT0gY3R4LnZpZXdlci5jb250cmFjdG9yX2lkKSA/IHJlZiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGVuZGFyJyk7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2FwcG9pbnRtZW50cycpO1xuICBpZiAobGVhZElkKSB7XG4gICAgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvbGVhZHMnKTtcbiAgICByZXZhbGlkYXRlUGF0aChgL2FwcC9sZWFkcy8ke2xlYWRJZH1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlckNoYW5nZShsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGZsdXNoTm90aWZpY2F0aW9uc1Nvb24oKTtcbiAgZmx1c2hDYWxlbmRhclN5bmNTb29uKCk7XG4gIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhdWRpdE92ZXJyaWRlKGFjdG9ySWQ6IHN0cmluZywgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIC8vIFNlcnZpY2Ugcm9sZTogYXVkaXRfbG9ncyBpcyBpbnNlcnQtcmVzdHJpY3RlZCB0byBhZG1pbnMgYnkgUkxTLCBidXQgc2V0dGVycyBtYXkgb3ZlcnJpZGUgdG9vIChhcyBvbiB0aGUgbGVhZCBwYWdlKS5cbiAgYXdhaXQgY3JlYXRlQWRtaW5DbGllbnQoKS5mcm9tKCdhdWRpdF9sb2dzJykuaW5zZXJ0KHsgYWN0b3JfaWQ6IGFjdG9ySWQsIGFjdGlvbjogJ2FwcG9pbnRtZW50LmF2YWlsYWJpbGl0eV9vdmVycmlkZScsIHRhcmdldF91c2VyX2lkOiBudWxsLCBtZXRhZGF0YSB9KTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBTbG90cyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTbG90c1BheWxvYWQge1xuICBzbG90czogUHVibGljU2xvdFtdO1xuICB0aW1lWm9uZTogc3RyaW5nO1xuICBkdXJhdGlvbk1pbnV0ZXM6IG51bWJlcjtcbiAgLyoqIFRoZSBib29raW5nJ3MgY3VycmVudCBzdGFydCAocmVzY2hlZHVsaW5nKS4gKi9cbiAgY3VycmVudDogc3RyaW5nIHwgbnVsbDtcbn1cblxuLyoqIE9wZW4gdGltZXMgb24gYSBjYWxlbmRhciBmb3IgdGhlIHBpY2tlcjsgd2l0aCBgcmVzY2hlZHVsZWAsIHRoYXQgYm9va2luZydzIG93biB0aW1lIGRvZXMgbm90IGJsb2NrLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENhbGVuZGFyU2xvdHMoaW5wdXQ6IHsgY2FsZW5kYXJJZDogc3RyaW5nOyByZXNjaGVkdWxlPzogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZyB9IH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdDxTbG90c1BheWxvYWQ+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBpbnB1dC5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICBsZXQgY3VycmVudDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIGxldCBleGNsdWRlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGlucHV0LnJlc2NoZWR1bGUpIHtcbiAgICBjb25zdCByZWYgPSBhd2FpdCB3b3JrYWJsZUJvb2tpbmcoY3R4LCBpbnB1dC5yZXNjaGVkdWxlLmtpbmQsIGlucHV0LnJlc2NoZWR1bGUuaWQpO1xuICAgIGlmICghcmVmIHx8IHJlZi5jYWxlbmRhcj8uaWQgIT09IGNhbC5pZCkgcmV0dXJuIGRlbmllZDtcbiAgICBjdXJyZW50ID0gcmVmLnNjaGVkdWxlZEF0ID8gbmV3IERhdGUocmVmLnNjaGVkdWxlZEF0KS50b0lTT1N0cmluZygpIDogbnVsbDtcbiAgICBleGNsdWRlSWQgPSByZWYuaWQ7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCByID0gYXdhaXQgZ2V0U2xvdHMoY2FsLmlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBleGNsdWRlSWQgfSk7XG4gICAgaWYgKCFyKSByZXR1cm4gZGVuaWVkO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHNsb3RzOiByLnNsb3RzLm1hcCgocykgPT4gKHsgc3RhcnQ6IG5ldyBEYXRlKHMuc3RhcnRNcykudG9JU09TdHJpbmcoKSwgZW5kOiBuZXcgRGF0ZShzLmVuZE1zKS50b0lTT1N0cmluZygpIH0pKSxcbiAgICAgIHRpbWVab25lOiByLmNhbGVuZGFyLnRpbWV6b25lLFxuICAgICAgZHVyYXRpb25NaW51dGVzOiByLmNhbGVuZGFyLmR1cmF0aW9uTWludXRlcyxcbiAgICAgIGN1cnJlbnQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhaWxlZCgndW5hdmFpbGFibGUnKTtcbiAgfVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qIFdobyBjYW4gYmUgYm9va2VkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvb2thYmxlUGFydHkge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nIHwgbnVsbDtcbiAgcGhvbmU6IHN0cmluZyB8IG51bGw7XG59XG5cbmNvbnN0IHNlYXJjaElucHV0ID0gei5vYmplY3QoeyBjYWxlbmRhcklkOiB1dWlkLCBxdWVyeTogei5zdHJpbmcoKS50cmltKCkubWF4KDgwKSB9KTtcblxuLyoqXG4gKiBMZWFkcyAoaG9tZW93bmVyIGNhbGVuZGFycykgb3IgY29udHJhY3RvciBwcm9zcGVjdHMgKHNhbGVzIGNhbGVuZGFyKSB0aGVcbiAqIHVzZXIgbWF5IGJvb2ssIG1hdGNoaW5nIGEgbmFtZSAvIHBob25lIC8gZW1haWwuIFJMUyBzY29wZXMgdGhlIHNlYXJjaDpcbiAqIHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdCwgYSBzZXR0ZXJcbiAqIG9ubHkgcHJvc3BlY3RzIGFzc2lnbmVkIHRvIHRoZW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWFyY2hCb29rYWJsZShjYWxlbmRhcklkOiBzdHJpbmcsIHF1ZXJ5OiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvblJlc3VsdDx7IHJlc3VsdHM6IEJvb2thYmxlUGFydHlbXSB9Pj4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBzZWFyY2hJbnB1dC5zYWZlUGFyc2UoeyBjYWxlbmRhcklkLCBxdWVyeSB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IHRydWUsIHJlc3VsdHM6IFtdIH07XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBwYXJzZWQuZGF0YS5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICAvLyBQb3N0Z1JFU1Qgb3ItZmlsdGVyOiBzdHJpcCB0aGUgY2hhcmFjdGVycyB0aGF0IHdvdWxkIGNoYW5nZSBpdHMgbWVhbmluZy5cbiAgY29uc3QgcSA9IHBhcnNlZC5kYXRhLnF1ZXJ5LnJlcGxhY2UoL1ssKCkqJVxcXFxdL2csICcgJykudHJpbSgpO1xuICBjb25zdCBkaWdpdHMgPSBxLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgbGV0IHJlcSA9IGN0eC51c2VyRGIuZnJvbSgnY29udHJhY3Rvcl9wcm9zcGVjdHMnKS5zZWxlY3QoJ2lkLCBjb21wYW55X25hbWUsIGRlY2lzaW9uX21ha2VyX25hbWUsIHBob25lLCBjaXR5Jykub3JkZXIoJ3VwZGF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICAgIGlmIChxKSByZXEgPSByZXEub3IoW2Bjb21wYW55X25hbWUuaWxpa2UuKiR7cX0qYCwgYGRlY2lzaW9uX21ha2VyX25hbWUuaWxpa2UuKiR7cX0qYCwgLi4uKGRpZ2l0cy5sZW5ndGggPj0gMyA/IFtgcGhvbmVfZTE2NC5pbGlrZS4qJHtkaWdpdHN9KmBdIDogW10pXS5qb2luKCcsJykpO1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHJlc3VsdHM6ICgoZGF0YSA/PyBbXSkgYXMgYW55W10pLm1hcCgocCkgPT4gKHtcbiAgICAgICAgaWQ6IHAuaWQsIG5hbWU6IHAuZGVjaXNpb25fbWFrZXJfbmFtZSA/IGAke3AuZGVjaXNpb25fbWFrZXJfbmFtZX0gwrcgJHtwLmNvbXBhbnlfbmFtZX1gIDogcC5jb21wYW55X25hbWUsIGRldGFpbDogcC5jaXR5ID8/IG51bGwsIHBob25lOiBwLnBob25lID8/IG51bGwsXG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIGxldCByZXEgPSBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwaG9uZSwgZW1haWwsIGNpdHksIHZlcnRpY2FsX2lkJykub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICBpZiAoY2FsLmtpbmQgPT09ICdjb250cmFjdG9yJykge1xuICAgIC8vIE9ubHkgbGVhZHMgYXNzaWduZWQgdG8gdGhpcyBjYWxlbmRhcidzIGNvbnRyYWN0b3IgY2FuIGdvIG9uIGl0ICh0aGUgUlBDIGxpbmtzIHRoZSBhc3NpZ25tZW50KS5cbiAgICBjb25zdCB7IGRhdGE6IGFzZyB9ID0gYXdhaXQgY3R4LnVzZXJEYlxuICAgICAgLmZyb20oJ2xlYWRfYXNzaWdubWVudHMnKVxuICAgICAgLnNlbGVjdCgnbGVhZF9pZCcpXG4gICAgICAuZXEoJ2NvbnRyYWN0b3JfaWQnLCBjYWwuY29udHJhY3RvcklkKVxuICAgICAgLm9yZGVyKCdhc3NpZ25lZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLy8gVGhlIG5ld2VzdCAzMDAga2VlcCB0aGUgaWQgbGlzdCB3ZWxsIGluc2lkZSBhIFVSTDsgb2xkZXIgbGVhZHMgYXJlIHJhcmVseSBib29rZWQgZnJvbSBoZXJlLlxuICAgICAgLmxpbWl0KDMwMCk7XG4gICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQoKChhc2cgPz8gW10pIGFzIGFueVtdKS5tYXAoKGEpID0+IGEubGVhZF9pZCBhcyBzdHJpbmcpKV07XG4gICAgaWYgKCFpZHMubGVuZ3RoKSByZXR1cm4geyBvazogdHJ1ZSwgcmVzdWx0czogW10gfTtcbiAgICByZXEgPSByZXEuaW4oJ2lkJywgaWRzKTtcbiAgfVxuICBpZiAocSkge1xuICAgIGNvbnN0IHdvcmRzID0gcS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5zbGljZSgwLCAyKTtcbiAgICBjb25zdCBvcnMgPSBbXG4gICAgICAuLi53b3Jkcy5mbGF0TWFwKCh3KSA9PiBbYGZpcnN0X25hbWUuaWxpa2UuKiR7d30qYCwgYGxhc3RfbmFtZS5pbGlrZS4qJHt3fSpgXSksXG4gICAgICBgZW1haWwuaWxpa2UuKiR7cX0qYCxcbiAgICAgIC4uLihkaWdpdHMubGVuZ3RoID49IDMgPyBbYHBob25lLmlsaWtlLioke2RpZ2l0cy5zbGljZSgtNyl9KmBdIDogW10pLFxuICAgIF07XG4gICAgcmVxID0gcmVxLm9yKG9ycy5qb2luKCcsJykpO1xuICB9XG4gIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICBjb25zdCBsZWFkcyA9IChkYXRhID8/IFtdKSBhcyBhbnlbXTtcbiAgY29uc3QgdmVydGljYWxJZHMgPSBbLi4ubmV3IFNldChsZWFkcy5tYXAoKGwpID0+IGwudmVydGljYWxfaWQpLmZpbHRlcihCb29sZWFuKSldO1xuICBjb25zdCB7IGRhdGE6IHZlcnRpY2FscyB9ID0gdmVydGljYWxJZHMubGVuZ3RoID8gYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCd2ZXJ0aWNhbHMnKS5zZWxlY3QoJ2lkLCBuYW1lJykuaW4oJ2lkJywgdmVydGljYWxJZHMpIDogeyBkYXRhOiBbXSB9O1xuICBjb25zdCB2ZXJ0aWNhbCA9IG5ldyBNYXAoKCh2ZXJ0aWNhbHMgPz8gW10pIGFzIGFueVtdKS5tYXAoKHYpID0+IFt2LmlkIGFzIHN0cmluZywgdi5uYW1lIGFzIHN0cmluZ10pKTtcbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByZXN1bHRzOiBsZWFkcy5tYXAoKGwpID0+ICh7XG4gICAgICBpZDogbC5pZCxcbiAgICAgIG5hbWU6IFtsLmZpcnN0X25hbWUsIGwubGFzdF9uYW1lXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpIHx8IGwucGhvbmUgfHwgbC5lbWFpbCB8fCAnTGVhZCcsXG4gICAgICBkZXRhaWw6IFt2ZXJ0aWNhbC5nZXQobC52ZXJ0aWNhbF9pZCksIGwuY2l0eV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyDCtyAnKSB8fCBudWxsLFxuICAgICAgcGhvbmU6IGwucGhvbmUgPz8gbnVsbCxcbiAgICB9KSksXG4gIH07XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogQm9vayAvIHJlc2NoZWR1bGUgLyBjYW5jZWwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGJvb2tJbnB1dCA9IHoub2JqZWN0KHtcbiAgY2FsZW5kYXJJZDogdXVpZCxcbiAgcGFydHlJZDogdXVpZCxcbiAgc3RhcnRzQXQ6IGlzbyxcbiAgbm90ZXM6IHouc3RyaW5nKCkudHJpbSgpLm1heCgyMDAwKS5vcHRpb25hbCgpLFxuICBvdmVycmlkZTogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogQm9vayBhIGNhbGwgb24gc29tZW9uZSdzIGJlaGFsZjogYSBsZWFkIG9uIGEgaG9tZW93bmVyIGNhbGVuZGFyLCBhIHByb3NwZWN0IG9uIHRoZSBzYWxlcyBjYWxlbmRhci4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBib29rQ2FsbE9uQmVoYWxmKGlucHV0OiB6LmlucHV0PHR5cGVvZiBib29rSW5wdXQ+KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBpZDogc3RyaW5nOyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGJvb2tJbnB1dC5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgYm9va2luZycgfTtcbiAgY29uc3QgeyBjYWxlbmRhcklkLCBwYXJ0eUlkLCBzdGFydHNBdCwgbm90ZXMgfSA9IHBhcnNlZC5kYXRhO1xuICBjb25zdCBjYWwgPSBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgY2FsZW5kYXJJZCk7XG4gIGlmICghY2FsIHx8ICFjYW5Xb3JrQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsKSkgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFjYWwuYWN0aXZlKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnVGhpcyBjYWxlbmRhciBpcyBzd2l0Y2hlZCBvZmYuIFR1cm4gaXQgb24gaW4gaXRzIHNldHRpbmdzIGZpcnN0LicgfTtcbiAgY29uc3Qgb3ZlcnJpZGUgPSAhIXBhcnNlZC5kYXRhLm92ZXJyaWRlICYmIGNhbk92ZXJyaWRlU2xvdHMoY3R4LnZpZXdlcik7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgLy8gUkxTOiBhZG1pbnMgc2VlIGV2ZXJ5IHByb3NwZWN0LCBhIHNldHRlciBvbmx5IHRob3NlIGFzc2lnbmVkIHRvIHRoZW0uXG4gICAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2NvbnRyYWN0b3JfcHJvc3BlY3RzJykuc2VsZWN0KCdpZCwgY29tcGFueV9uYW1lLCBkZWNpc2lvbl9tYWtlcl9uYW1lLCBwaG9uZSwgZW1haWwnKS5lcSgnaWQnLCBwYXJ0eUlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghcCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ1Byb3NwZWN0IG5vdCBmb3VuZC4nIH07XG4gICAgY29uc3QgciA9IGF3YWl0IGJvb2tTYWxlc0FwcG9pbnRtZW50KHtcbiAgICAgIGNhbGVuZGFySWQ6IGNhbC5pZCwgc3RhcnRzQXQsIHByb3NwZWN0SWQ6IHAuaWQsXG4gICAgICAvLyBUaGUgcGVyc29uIGJvb2tpbmcgaXMgY3JlZGl0ZWQsIGFzIGluIHRoZSBjYWxsaW5nIHdvcmtzcGFjZSAoc2V0dGVyIHBheSwgMDA2MikuXG4gICAgICBwYXJ0bmVySWQ6IGN0eC5wcm9maWxlLmlkLCBzb3VyY2U6ICdtYW51YWwnLFxuICAgICAgY29udGFjdDogeyBuYW1lOiBwLmRlY2lzaW9uX21ha2VyX25hbWUgPz8gdW5kZWZpbmVkLCBwaG9uZTogcC5waG9uZSA/PyB1bmRlZmluZWQsIGVtYWlsOiBwLmVtYWlsID8/IHVuZGVmaW5lZCB9LFxuICAgICAgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgICB9KTtcbiAgICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IHNhbGVzX2FwcG9pbnRtZW50X2lkOiByLnNhbGVzQXBwb2ludG1lbnRJZCwgY2FsZW5kYXJfaWQ6IGNhbC5pZCwgc2NoZWR1bGVkX2F0OiByLnN0YXJ0c0F0IH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogJ3NhbGVzX2FwcG9pbnRtZW50JywgaWQ6IHIuc2FsZXNBcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgICBhZnRlckNoYW5nZSgpO1xuICAgIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGxzL2FwcG9pbnRtZW50cycpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5zYWxlc0FwcG9pbnRtZW50SWQsIHN0YXJ0c0F0OiByLnN0YXJ0c0F0IH07XG4gIH1cblxuICAvLyBSTFM6IHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdC5cbiAgY29uc3QgeyBkYXRhOiBsZWFkIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCcpLmVxKCdpZCcsIHBhcnR5SWQpLm1heWJlU2luZ2xlKCk7XG4gIGlmICghbGVhZCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0xlYWQgbm90IGZvdW5kLicgfTtcbiAgY29uc3QgciA9IGF3YWl0IGJvb2tBcHBvaW50bWVudCh7XG4gICAgY2FsZW5kYXJJZDogY2FsLmlkLCBzdGFydHNBdCwgbGVhZElkOiBsZWFkLmlkLCBzb3VyY2U6ICdtYW51YWwnLCBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgfSk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IGFwcG9pbnRtZW50X2lkOiByLmFwcG9pbnRtZW50SWQsIGNhbGVuZGFyX2lkOiBjYWwuaWQsIHNjaGVkdWxlZF9hdDogci5zdGFydHNBdCB9KTtcbiAgbm90aWZ5Qm9va2luZ1Nvb24oeyBraW5kOiAnYXBwb2ludG1lbnQnLCBpZDogci5hcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UobGVhZC5pZCk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5hcHBvaW50bWVudElkLCBzdGFydHNBdDogci5zdGFydHNBdCB9O1xufVxuXG5jb25zdCBjaGFuZ2VJbnB1dCA9IHoub2JqZWN0KHsga2luZDogei5lbnVtKFsnYXBwb2ludG1lbnQnLCAndmlzaXQnLCAnc2FsZXNfYXBwb2ludG1lbnQnXSksIGlkOiB1dWlkIH0pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzY2hlZHVsZUNhbGVuZGFyRXZlbnQoaW5wdXQ6IHsga2luZDogRXZlbnRLaW5kSW5wdXQ7IGlkOiBzdHJpbmc7IHN0YXJ0c0F0OiBzdHJpbmc7IG92ZXJyaWRlPzogYm9vbGVhbiB9KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXJ0c0F0OiBpc28sIG92ZXJyaWRlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpIH0pLnNhZmVQYXJzZShpbnB1dCk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgdmFsaWQgdGltZScgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFyZWYuY2FsZW5kYXIpIHJldHVybiBmYWlsZWQoJ25vdF9ib29rYWJsZScpO1xuICBjb25zdCBvdmVycmlkZSA9ICEhcGFyc2VkLmRhdGEub3ZlcnJpZGUgJiYgY2FuT3ZlcnJpZGVTbG90cyhjdHgudmlld2VyKTtcbiAgY29uc3Qgb3B0cyA9IHsgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIGFjdG9yS2luZDogJ3VzZXInIGFzIGNvbnN0LCBvdmVycmlkZSB9O1xuICBjb25zdCByID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCdcbiAgICA/IGF3YWl0IHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcGFyc2VkLmRhdGEuc3RhcnRzQXQsIG9wdHMpXG4gICAgOiBhd2FpdCByZXNjaGVkdWxlQXBwb2ludG1lbnQocmVmLmlkLCBwYXJzZWQuZGF0YS5zdGFydHNBdCwgb3B0cyk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgY29uc3Qgc3RhcnRzQXQgPSByLnN0YXJ0c0F0ID8/IG5ldyBEYXRlKHBhcnNlZC5kYXRhLnN0YXJ0c0F0KS50b0lTT1N0cmluZygpO1xuICBpZiAoIXIudW5jaGFuZ2VkKSB7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IFtgJHtyZWYua2luZH1faWRgXTogcmVmLmlkLCBjYWxlbmRhcl9pZDogcmVmLmNhbGVuZGFyLmlkLCBzY2hlZHVsZWRfYXQ6IHN0YXJ0c0F0LCByZXNjaGVkdWxlOiB0cnVlIH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogcmVmLmtpbmQsIGlkOiByZWYuaWQsIGNoYW5nZTogJ3Jlc2NoZWR1bGVkJywgcHJldmlvdXNTdGFydHNBdDogci5wcmV2aW91c1N0YXJ0c0F0ID8/IHJlZi5zY2hlZHVsZWRBdCwgYWN0b3JLaW5kOiAndXNlcicgfSk7XG4gIH1cbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBzdGFydHNBdCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FuY2VsQ2FsZW5kYXJFdmVudChpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBjaGFuZ2VJbnB1dC5leHRlbmQoeyByZWFzb246IHouc3RyaW5nKCkudHJpbSgpLm1heCg1MDApLm9wdGlvbmFsKCkgfSkuc2FmZVBhcnNlKGlucHV0KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0NoZWNrIHRoZSBjYW5jZWxsYXRpb24nIH07XG4gIGNvbnN0IHJlZiA9IGF3YWl0IHdvcmthYmxlQm9va2luZyhjdHgsIHBhcnNlZC5kYXRhLmtpbmQsIHBhcnNlZC5kYXRhLmlkKTtcbiAgaWYgKCFyZWYpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHJlYXNvbiA9IHBhcnNlZC5kYXRhLnJlYXNvbiB8fCBudWxsO1xuICBjb25zdCBvcHRzID0geyBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicgYXMgY29uc3QgfTtcbiAgY29uc3QgciA9IHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnXG4gICAgPyBhd2FpdCBjYW5jZWxTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcmVhc29uLCBvcHRzKVxuICAgIDogYXdhaXQgY2FuY2VsQXBwb2ludG1lbnQocmVmLmlkLCByZWFzb24sIG9wdHMpO1xuICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gIC8vIENhbGVuZGFyIGJvb2tpbmdzIHRlbGwgdGhlIGhvbWVvd25lciAvIHByb3NwZWN0OyBhbiBvbi1zaXRlIHZpc2l0J3Mgbm90aWNlcyBzdGF5IHdpdGggaXRzIHdvcmtmbG93cy5cbiAgaWYgKCFyLmFscmVhZHkgJiYgcmVmLmNhbGVuZGFyKSBub3RpZnlCb29raW5nU29vbih7IGtpbmQ6IHJlZi5raW5kLCBpZDogcmVmLmlkLCBjaGFuZ2U6ICdjYW5jZWxsZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlIH07XG59XG5cbmNvbnN0IFNUQVRVU19GT1I6IFJlY29yZDwnYXBwb2ludG1lbnQnIHwgJ3NhbGVzX2FwcG9pbnRtZW50Jywgc3RyaW5nW10+ID0ge1xuICBhcHBvaW50bWVudDogWydoZWxkJywgJ25vX3Nob3cnLCAnc2NoZWR1bGVkJ10sXG4gIHNhbGVzX2FwcG9pbnRtZW50OiBbJ2NvbXBsZXRlZCcsICdub19zaG93JywgJ3NjaGVkdWxlZCddLFxufTtcblxuLyoqIEhlbGQgLyBuby1zaG93IChhbmQgYmFjayB0byBzY2hlZHVsZWQgdG8gdW5kbykuIENhbmNlbGxpbmcgZ29lcyB0aHJvdWdoIGNhbmNlbENhbGVuZGFyRXZlbnQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q2FsZW5kYXJFdmVudFN0YXR1cyhpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgc3RhdHVzOiBzdHJpbmcgfSk6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXR1czogei5zdHJpbmcoKSB9KS5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnUGljayBhIHN0YXR1cycgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgY29uc3Qgc3RhdHVzID0gcGFyc2VkLmRhdGEuc3RhdHVzO1xuICBpZiAoIVNUQVRVU19GT1JbcmVmLmtpbmRdLmluY2x1ZGVzKHN0YXR1cykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgc3RhdHVzJyB9O1xuICBpZiAocmVmLnN0YXR1cyA9PT0gJ2NhbmNlbGxlZCcpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdBIGNhbmNlbGxlZCBjYWxsIGNhbm5vdCBiZSBtYXJrZWQuIEJvb2sgYSBuZXcgb25lIGluc3RlYWQuJyB9O1xuXG4gIC8vIFRoZSB1c2VyJ3Mgb3duIGNsaWVudDogdGhlIGV4aXN0aW5nIFJMUyB3cml0ZSBydWxlcyBkZWNpZGUgKGUuZy4gYSBzZXR0ZXIgZWRpdHMgb25seSBzYWxlcyBtZWV0aW5ncyB0aGV5IGJvb2tlZCkuXG4gIGNvbnN0IHRhYmxlID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCcgPyAncHJvc3BlY3Rfc2FsZXNfYXBwb2ludG1lbnRzJyA6ICdhcHBvaW50bWVudHMnO1xuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20odGFibGUpLnVwZGF0ZSh7IHN0YXR1cyB9KS5lcSgnaWQnLCByZWYuaWQpLnNlbGVjdCgnaWQnKTtcbiAgaWYgKGVycm9yIHx8ICEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiByZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JyA/ICdPbmx5IGFuIGFkbWluIG9yIHRoZSBzZXR0ZXIgd2hvIGJvb2tlZCB0aGlzIG1lZXRpbmcgY2FuIGNoYW5nZSBpdC4nIDogJ1RoaXMgYXBwb2ludG1lbnQgY291bGQgbm90IGJlIHVwZGF0ZWQuJyB9O1xuICB9XG5cbiAgaWYgKHJlZi5raW5kID09PSAnYXBwb2ludG1lbnQnICYmIHJlZi5sZWFkSWQgJiYgc3RhdHVzID09PSAnaGVsZCcpIHtcbiAgICAvLyBBIGhlbGQgY2FsbCB3aXRoIHRoZSBIb21lUXVvdGUgdGVhbSBpcyBub3QgdGhlIGNvbnRyYWN0b3IgYXBwb2ludG1lbnQ6IHRoZSBsZWFkJ3Mgc3RhZ2Ugc3RheXMgd2hlcmUgaXQgaXMuXG4gICAgY29uc3QgdGVhbUNhbGwgPSByZWYuY2FsZW5kYXI/LmtpbmQgPT09ICd0ZWFtJztcbiAgICBpZiAoIXRlYW1DYWxsKSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykudXBkYXRlKHsgc3RhdHVzOiAnYXBwb2ludG1lbnRfY29tcGxldGVkJyB9KS5lcSgnaWQnLCByZWYubGVhZElkKTtcbiAgICBjb25zdCBjb250cmFjdG9ySWQgPSByZWYuY2FsZW5kYXI/LmNvbnRyYWN0b3JJZCA/PyByZWYudmlzaXRDb250cmFjdG9ySWQ7XG4gICAgYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCdsZWFkX2FjdGl2aXRpZXMnKS5pbnNlcnQoe1xuICAgICAgbGVhZF9pZDogcmVmLmxlYWRJZCwgYWN0b3JfaWQ6IGN0eC5wcm9maWxlLmlkLCB0eXBlOiAnYXBwb2ludG1lbnQnLCBib2R5OiB0ZWFtQ2FsbCA/ICdDYWxsIHdpdGggdGhlIEhvbWVRdW90ZSB0ZWFtIGhlbGQnIDogJ0FwcG9pbnRtZW50IGNvbXBsZXRlZCcsXG4gICAgICAvLyBDb250cmFjdG9yLWF1dGhvcmVkIGVudHJpZXMgbXVzdCBuYW1lIHRoZWlyIG93biBjb21wYW55IChhY3Rpdml0aWVzX2luc2VydCBSTFMpLlxuICAgICAgbWV0YWRhdGE6IHsgYXBwb2ludG1lbnRfaWQ6IHJlZi5pZCwgLi4uKGNvbnRyYWN0b3JJZCA/IHsgY29udHJhY3Rvcl9pZDogY29udHJhY3RvcklkIH0gOiB7fSkgfSxcbiAgICB9KTtcbiAgfVxuICBhZnRlckNoYW5nZShyZWYubGVhZElkKTtcbiAgaWYgKHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSByZXZhbGlkYXRlUGF0aCgnL2FwcC9jYWxscy9hcHBvaW50bWVudHMnKTtcbiAgcmV0dXJuIHsgb2s6IHRydWUgfTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBDYWxlbmRhciBzZXR0aW5ncyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQ6IHN0cmluZyk6IFByb21pc2U8eyBjdHg6IEN0eDsgY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciB9IHwgeyBlcnJvcjogc3RyaW5nIH0+IHtcbiAgY29uc3QgY3R4ID0gYXdhaXQgY29udGV4dCgpO1xuICBpZiAoIWN0eCkgcmV0dXJuIHsgZXJyb3I6IGRlbmllZC5lcnJvciB9O1xuICBjb25zdCBjYWxlbmRhciA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBjYWxlbmRhcklkKTtcbiAgaWYgKCFjYWxlbmRhcikgcmV0dXJuIHsgZXJyb3I6ICdDYWxlbmRhciBub3QgZm91bmQnIH07XG4gIGlmICghY2FuTWFuYWdlQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsZW5kYXIpKSByZXR1cm4geyBlcnJvcjogJ09ubHkgYSBIb21lUXVvdGUgYWRtaW4gb3IgdGhlIGNvbXBhbnkgb3duZXIgY2FuIGNoYW5nZSB0aGlzIGNhbGVuZGFyLicgfTtcbiAgcmV0dXJuIHsgY3R4LCBjYWxlbmRhciB9O1xufVxuXG5jb25zdCBmaWVsZCA9IChmOiBGb3JtRGF0YSwgazogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHYgPSBmLmdldChrKTtcbiAgcmV0dXJuIHYgPT09IG51bGwgPyBudWxsIDogU3RyaW5nKHYpLnRyaW0oKTtcbn07XG5jb25zdCBpbnRGaWVsZCA9IChsbzogbnVtYmVyLCBoaTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpID0+IHouY29lcmNlLm51bWJlcih7IGludmFsaWRfdHlwZV9lcnJvcjogbWVzc2FnZSB9KS5pbnQobWVzc2FnZSkubWluKGxvLCBtZXNzYWdlKS5tYXgoaGksIG1lc3NhZ2UpO1xuXG5jb25zdCBzZXR0aW5nc1NjaGVtYSA9IHpcbiAgLm9iamVjdCh7XG4gICAgbmFtZTogei5zdHJpbmcoKS5taW4oMSwgJ0dpdmUgdGhlIGNhbGVuZGFyIGEgbmFtZScpLm1heCgxMjAsICdVc2UgMTIwIGNoYXJhY3RlcnMgb3IgZmV3ZXInKSxcbiAgICB0aW1lem9uZTogei5zdHJpbmcoKS5yZWZpbmUoaXNWYWxpZFRpbWVab25lLCAnUGljayBhIHZhbGlkIHRpbWUgem9uZScpLFxuICAgIGR1cmF0aW9uX21pbnV0ZXM6IGludEZpZWxkKDEwLCAyNDAsICdDYWxsIGxlbmd0aCBtdXN0IGJlIDEw4oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogaW50RmllbGQoNSwgMjQwLCAnU3RhcnQgdGltZXMgbXVzdCBiZSBldmVyeSA14oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBidWZmZXJfbWludXRlczogaW50RmllbGQoMCwgMjQwLCAnQnVmZmVyIG11c3QgYmUgMOKAkzI0MCBtaW51dGVzJyksXG4gICAgbWluX25vdGljZV9taW51dGVzOiBpbnRGaWVsZCgwLCA0MzIwMCwgJ01pbmltdW0gbm90aWNlIG11c3QgYmUgMOKAkzcyMCBob3VycycpLFxuICAgIGhvcml6b25fZGF5czogaW50RmllbGQoMSwgMTIwLCAnQm9vayBhaGVhZCBtdXN0IGJlIDHigJMxMjAgZGF5cycpLFxuICAgIG1heF9wZXJfZGF5OiBpbnRGaWVsZCgxLCAxMDAsICdNYXggcGVyIGRheSBtdXN0IGJlIDHigJMxMDAnKS5udWxsYWJsZSgpLFxuICAgIG1lZXRpbmdfdHlwZTogei5lbnVtKFsncGhvbmUnLCAndmlkZW8nXSksXG4gICAgdmlkZW9fbGluazogei5zdHJpbmcoKS5tYXgoNTAwKS5yZWdleCgvXmh0dHBzOlxcL1xcLy8sICdUaGUgdmlkZW8gbGluayBtdXN0IHN0YXJ0IHdpdGggaHR0cHM6Ly8nKS5udWxsYWJsZSgpLFxuICAgIGFjdGl2ZTogei5ib29sZWFuKCksXG4gIH0pXG4gIC5yZWZpbmUoKHMpID0+IHMubWVldGluZ190eXBlICE9PSAndmlkZW8nIHx8ICEhcy52aWRlb19saW5rLCB7IG1lc3NhZ2U6ICdBZGQgdGhlIHZpZGVvIGxpbmsgY2FsbGVycyB3aWxsIGpvaW4nLCBwYXRoOiBbJ3ZpZGVvX2xpbmsnXSB9KTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJTZXR0aW5ncyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgY29uc3Qgbm90aWNlID0gZmllbGQoZm9ybURhdGEsICdtaW5fbm90aWNlX2hvdXJzJyk7XG4gIGNvbnN0IHBhcnNlZCA9IHNldHRpbmdzU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgbmFtZTogZmllbGQoZm9ybURhdGEsICduYW1lJyksXG4gICAgdGltZXpvbmU6IGZpZWxkKGZvcm1EYXRhLCAndGltZXpvbmUnKSxcbiAgICBkdXJhdGlvbl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2R1cmF0aW9uX21pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogZmllbGQoZm9ybURhdGEsICdzbG90X3N0ZXBfbWludXRlcycpLFxuICAgIGJ1ZmZlcl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2J1ZmZlcl9taW51dGVzJykgfHwgMCxcbiAgICBtaW5fbm90aWNlX21pbnV0ZXM6IG5vdGljZSA/IE1hdGgucm91bmQoTnVtYmVyKG5vdGljZSkgKiA2MCkgOiAwLFxuICAgIGhvcml6b25fZGF5czogZmllbGQoZm9ybURhdGEsICdob3Jpem9uX2RheXMnKSxcbiAgICBtYXhfcGVyX2RheTogZmllbGQoZm9ybURhdGEsICdtYXhfcGVyX2RheScpIHx8IG51bGwsXG4gICAgbWVldGluZ190eXBlOiBmaWVsZChmb3JtRGF0YSwgJ21lZXRpbmdfdHlwZScpLFxuICAgIHZpZGVvX2xpbms6IGZpZWxkKGZvcm1EYXRhLCAndmlkZW9fbGluaycpIHx8IG51bGwsXG4gICAgYWN0aXZlOiBmb3JtRGF0YS5nZXQoJ2FjdGl2ZScpID09PSAnb24nLFxuICB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgZXJyb3I6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgPz8gJ0NoZWNrIHRoZSBzZXR0aW5ncycgfTtcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJzJykudXBkYXRlKHBhcnNlZC5kYXRhKS5lcSgnaWQnLCBtLmNhbGVuZGFyLmlkKS5zZWxlY3QoJ2lkJyk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgaWYgKCEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHJldHVybiB7IGVycm9yOiAnWW91IGNhbuKAmXQgY2hhbmdlIHRoaXMgY2FsZW5kYXIuJyB9O1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbiAgcmV0dXJuIHsgc3VjY2VzczogJ1NldHRpbmdzIHNhdmVkJyB9O1xufVxuXG5jb25zdCBydWxlU2NoZW1hID0gelxuICAub2JqZWN0KHsgd2Vla2RheTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDYpLCBzdGFydE1pbnV0ZTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDE0MzkpLCBlbmRNaW51dGU6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgxNDQwKSB9KVxuICAucmVmaW5lKChyKSA9PiByLmVuZE1pbnV0ZSA+IHIuc3RhcnRNaW51dGUsICdFbmQgdGltZSBtdXN0IGJlIGFmdGVyIHN0YXJ0IHRpbWUnKTtcblxuLyoqIFJlcGxhY2UgdGhlIGNhbGVuZGFyJ3Mgd2Vla2x5IGhvdXJzIChXZWVrbHlFZGl0b3IncyBgcnVsZXNgIEpTT04pLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJSdWxlcyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgbGV0IHJhdzogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICByYXcgPSBKU09OLnBhcnNlKFN0cmluZyhmb3JtRGF0YS5nZXQoJ3J1bGVzJykgPz8gJ1tdJykpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIHRoZSBob3VycycgfTtcbiAgfVxuICBjb25zdCBwYXJzZWQgPSB6LmFycmF5KHJ1bGVTY2hlbWEpLm1heCg1MCkuc2FmZVBhcnNlKHJhdyk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgaG91cnMnIH07XG4gIGNvbnN0IHJ1bGVzID0gcGFyc2VkLmRhdGE7XG4gIGZvciAobGV0IGQgPSAwOyBkIDwgNzsgZCsrKSB7XG4gICAgY29uc3QgZGF5ID0gcnVsZXMuZmlsdGVyKChyKSA9PiByLndlZWtkYXkgPT09IGQpLnNvcnQoKGEsIGIpID0+IGEuc3RhcnRNaW51dGUgLSBiLnN0YXJ0TWludXRlKTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGRheS5sZW5ndGg7IGkrKykgaWYgKGRheVtpXS5zdGFydE1pbnV0ZSA8IGRheVtpIC0gMV0uZW5kTWludXRlKSByZXR1cm4geyBlcnJvcjogJ0hvdXJzIG9uIHRoZSBzYW1lIGRheSBvdmVybGFwJyB9O1xuICB9XG4gIGNvbnN0IGRiID0gbS5jdHgudXNlckRiO1xuICBjb25zdCB7IGVycm9yOiBkZWxFcnJvciB9ID0gYXdhaXQgZGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcl9ydWxlcycpLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpO1xuICBpZiAoZGVsRXJyb3IpIHJldHVybiB7IGVycm9yOiBkZWxFcnJvci5tZXNzYWdlIH07XG4gIGlmIChydWxlcy5sZW5ndGgpIHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBkYi5mcm9tKCdib29raW5nX2NhbGVuZGFyX3J1bGVzJykuaW5zZXJ0KFxuICAgICAgcnVsZXMubWFwKChyKSA9PiAoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgd2Vla2RheTogci53ZWVrZGF5LCBzdGFydF9taW51dGU6IHIuc3RhcnRNaW51dGUsIGVuZF9taW51dGU6IHIuZW5kTWludXRlIH0pKVxuICAgICk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4geyBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG4gIHJlZnJlc2hDYWxlbmRhcigpO1xuICByZXR1cm4geyBzdWNjZXNzOiBydWxlcy5sZW5ndGggPyAnSG91cnMgc2F2ZWQnIDogJ0hvdXJzIGNsZWFyZWQ6IG5vdGhpbmcgY2FuIGJlIGJvb2tlZCB1bnRpbCB5b3UgYWRkIHNvbWUnIH07XG59XG5cbi8qKiBQZW9wbGUgd2hvIG1heSBob3N0IGEgY2FsZW5kYXI6IHRlYW0gLyBzYWxlcyB0YWtlIEhvbWVRdW90ZSBhZG1pbnMgKyBzZXR0ZXJzOyBhIGNvbnRyYWN0b3IgY2FsZW5kYXIgaXRzIG93biBjb21wYW55J3MgdXNlcnMuICovXG5hc3luYyBmdW5jdGlvbiBlbGlnaWJsZUhvc3QoY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciwgdXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjcmVhdGVBZG1pbkNsaWVudCgpLmZyb20oJ3Byb2ZpbGVzJykuc2VsZWN0KCdpZCwgcm9sZSwgY29udHJhY3Rvcl9pZCwgaXNfYWN0aXZlJykuZXEoJ2lkJywgdXNlcklkKS5tYXliZVNpbmdsZSgpO1xuICBpZiAoIXAgfHwgcC5pc19hY3RpdmUgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBjYWxlbmRhci5raW5kID09PSAnY29udHJhY3RvcicgPyBwLnJvbGUgPT09ICdjb250cmFjdG9yJyAmJiBwLmNvbnRyYWN0b3JfaWQgPT09IGNhbGVuZGFyLmNvbnRyYWN0b3JJZCA6IHAucm9sZSA9PT0gJ2FkbWluJyB8fCBwLnJvbGUgPT09ICdzZXR0ZXInO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQm9va2luZ0NhbGVuZGFyTWVtYmVyKGNhbGVuZGFySWQ6IHN0cmluZywgX3ByZXY6IFNldHRpbmdzU3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8U2V0dGluZ3NTdGF0ZT4ge1xuICBjb25zdCBtID0gYXdhaXQgbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQpO1xuICBpZiAoJ2Vycm9yJyBpbiBtKSByZXR1cm4geyBlcnJvcjogbS5lcnJvciB9O1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZSh1c2VySWQpLnN1Y2Nlc3MgfHwgIShhd2FpdCBlbGlnaWJsZUhvc3QobS5jYWxlbmRhciwgdXNlcklkKSkpIHJldHVybiB7IGVycm9yOiAnUGljayBhIHBlcnNvbiB0byBhZGQnIH07XG4gIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IG0uY3R4LnVzZXJEYlxuICAgIC5mcm9tKCdib29raW5nX2NhbGVuZGFyX21lbWJlcnMnKVxuICAgIC51cHNlcnQoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgdXNlcl9pZDogdXNlcklkLCBub3RpZnk6IHRydWUgfSwgeyBvbkNvbmZsaWN0OiAnY2FsZW5kYXJfaWQsdXNlcl9pZCcgfSk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgcmVmcmVzaENhbGVuZGFyKCk7XG4gIHJldHVybiB7IHN1Y2Nlc3M6ICdIb3N0IGFkZGVkJyB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va2luZ0NhbGVuZGFyTWVtYmVyKGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjYWxlbmRhcklkID0gZmllbGQoZm9ybURhdGEsICdjYWxlbmRhcl9pZCcpID8/ICcnO1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgY29uc3Qgb3AgPSBmaWVsZChmb3JtRGF0YSwgJ29wJyk7XG4gIGNvbnN0IG0gPSBhd2FpdCBtYW5hZ2VhYmxlQ2FsZW5kYXIoY2FsZW5kYXJJZCk7XG4gIGlmICgnZXJyb3InIGluIG0gfHwgIXV1aWQuc2FmZVBhcnNlKHVzZXJJZCkuc3VjY2VzcykgcmV0dXJuO1xuICBjb25zdCBtZW1iZXJzID0gbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJfbWVtYmVycycpO1xuICBpZiAob3AgPT09ICdyZW1vdmUnKSBhd2FpdCBtZW1iZXJzLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpLmVxKCd1c2VyX2lkJywgdXNlcklkKTtcbiAgZWxzZSBpZiAob3AgPT09ICdub3RpZnlfb24nIHx8IG9wID09PSAnbm90aWZ5X29mZicpIGF3YWl0IG1lbWJlcnMudXBkYXRlKHsgbm90aWZ5OiBvcCA9PT0gJ25vdGlmeV9vbicgfSkuZXEoJ2NhbGVuZGFyX2lkJywgbS5jYWxlbmRhci5pZCkuZXEoJ3VzZXJfaWQnLCB1c2VySWQpO1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiZ1NBNEpzQiJ9
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calendar/slot-chooser.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SlotChooser",
    ()=>SlotChooser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/availability/time.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$slot$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/slot-picker.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2d$label$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/zone-label.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$70861c__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/lib/actions/data:70861c [app-client] (ecmascript) <text/javascript>");
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
function SlotChooser({ calendarId, calendarTimeZone, reschedule, allowOverride, value, onChange }) {
    _s();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [zone, setZone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(calendarTimeZone);
    const [browserZone, setBrowserZone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [other, setOther] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const rescheduleKey = reschedule ? `${reschedule.kind}:${reschedule.id}` : '';
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SlotChooser.useEffect": ()=>{
            let live = true;
            setState(null);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$70861c__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["getCalendarSlots"])({
                calendarId,
                ...reschedule ? {
                    reschedule
                } : {}
            }).then({
                "SlotChooser.useEffect": (r)=>{
                    if (live) setState(r);
                }
            }["SlotChooser.useEffect"]).catch({
                "SlotChooser.useEffect": ()=>{
                    if (live) setState({
                        ok: false,
                        error: 'Could not load open times. Try again.'
                    });
                }
            }["SlotChooser.useEffect"]);
            return ({
                "SlotChooser.useEffect": ()=>{
                    live = false;
                }
            })["SlotChooser.useEffect"];
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the calendar or booking changes
        }
    }["SlotChooser.useEffect"], [
        calendarId,
        rescheduleKey
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SlotChooser.useEffect": ()=>{
            try {
                setBrowserZone(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
            } catch  {
                setBrowserZone(null);
            }
        }
    }["SlotChooser.useEffect"], []);
    if (!state) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$slot$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SlotPickerSkeleton"], {}, void 0, false, {
        fileName: "[project]/components/calendar/slot-chooser.tsx",
        lineNumber: 63,
        columnNumber: 22
    }, this);
    if (!state.ok) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: "text-sm text-destructive",
        role: "alert",
        children: state.error
    }, void 0, false, {
        fileName: "[project]/components/calendar/slot-chooser.tsx",
        lineNumber: 64,
        columnNumber: 25
    }, this);
    const slots = state.slots;
    const otherMs = other ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseWallTime"])(other, calendarTimeZone) : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-5",
        children: [
            slots.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "rounded-lg border border-dashed p-3 text-sm text-muted-foreground",
                children: "No open times coming up. Check the calendar’s hours and booking window in its settings."
            }, void 0, false, {
                fileName: "[project]/components/calendar/slot-chooser.tsx",
                lineNumber: 72,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$slot$2d$picker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SlotPicker"], {
                slots: slots,
                timeZone: zone,
                zoneChoices: [
                    calendarTimeZone,
                    ...browserZone ? [
                        browserZone
                    ] : []
                ],
                onTimeZoneChange: setZone,
                selected: value && !value.override ? value.startsAt : null,
                current: state.current,
                onSelect: (start)=>{
                    setOther('');
                    onChange({
                        startsAt: start,
                        override: false
                    });
                },
                headingLevel: 3
            }, void 0, false, {
                fileName: "[project]/components/calendar/slot-chooser.tsx",
                lineNumber: 76,
                columnNumber: 9
            }, this),
            allowOverride ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-1.5 rounded-lg border p-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        htmlFor: `other-${calendarId}`,
                        className: "text-sm font-medium",
                        children: "Another time (book anyway)"
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/slot-chooser.tsx",
                        lineNumber: 90,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-muted-foreground",
                        children: [
                            "Outside the open hours, notice or daily limit. ",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2d$label$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zoneLabel"])(Date.now(), calendarTimeZone),
                            ". It still can’t double-book anyone, and it is logged."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/slot-chooser.tsx",
                        lineNumber: 91,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                        id: `other-${calendarId}`,
                        type: "datetime-local",
                        value: other,
                        onChange: (e)=>{
                            setOther(e.target.value);
                            const ms = e.target.value ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseWallTime"])(e.target.value, calendarTimeZone) : null;
                            onChange(ms === null ? null : {
                                startsAt: new Date(ms).toISOString(),
                                override: true
                            });
                        },
                        className: "w-full sm:w-64"
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/slot-chooser.tsx",
                        lineNumber: 94,
                        columnNumber: 11
                    }, this),
                    otherMs !== null ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-muted-foreground",
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatSlot"])(otherMs, calendarTimeZone)
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/slot-chooser.tsx",
                        lineNumber: 105,
                        columnNumber: 31
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/slot-chooser.tsx",
                lineNumber: 89,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/slot-chooser.tsx",
        lineNumber: 70,
        columnNumber: 5
    }, this);
}
_s(SlotChooser, "KhoIrsfws49IbGawCy/LCOTP+yk=");
_c = SlotChooser;
var _c;
__turbopack_context__.k.register(_c, "SlotChooser");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calendar/book-call-sheet.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BookCallButton",
    ()=>BookCallButton,
    "BookCallSheet",
    ()=>BookCallSheet
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarPlus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-plus.js [app-client] (ecmascript) <export default as CalendarPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$c186f3__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/lib/actions/data:c186f3 [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$4b499e__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/lib/actions/data:4b499e [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calls$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calls/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/textarea.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/panel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$slot$2d$chooser$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/slot-chooser.tsx [app-client] (ecmascript)");
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
function BookCallSheet({ calendarId, calendarName, calendarKind, timeZone, allowOverride, open, onOpenChange }) {
    _s();
    const [step, setStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('who');
    const [query, setQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [results, setResults] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [party, setParty] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [chosen, setChosen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [notes, setNotes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [done, setDone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [pending, start] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"])();
    const who = calendarKind === 'sales' ? 'prospect' : 'lead';
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookCallSheet.useEffect": ()=>{
            if (!open) return;
            setStep('who');
            setQuery('');
            setParty(null);
            setChosen(null);
            setNotes('');
            setError(null);
            setDone(null);
        }
    }["BookCallSheet.useEffect"], [
        open,
        calendarId
    ]);
    // Search as they type (debounced); the first open lists the newest.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "BookCallSheet.useEffect": ()=>{
            if (!open || step !== 'who') return;
            let live = true;
            const t = setTimeout({
                "BookCallSheet.useEffect.t": ()=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$4b499e__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["searchBookable"])(calendarId, query).then({
                        "BookCallSheet.useEffect.t": (r)=>{
                            if (live) setResults(r.ok ? r.results : []);
                            if (live && !r.ok) setError(r.error);
                        }
                    }["BookCallSheet.useEffect.t"]).catch({
                        "BookCallSheet.useEffect.t": ()=>{
                            if (live) setResults([]);
                        }
                    }["BookCallSheet.useEffect.t"]);
                }
            }["BookCallSheet.useEffect.t"], query ? 250 : 0);
            return ({
                "BookCallSheet.useEffect": ()=>{
                    live = false;
                    clearTimeout(t);
                }
            })["BookCallSheet.useEffect"];
        }
    }["BookCallSheet.useEffect"], [
        open,
        step,
        query,
        calendarId
    ]);
    const book = ()=>{
        if (!party || !chosen) return;
        setError(null);
        start(async ()=>{
            const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$c186f3__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["bookCallOnBehalf"])({
                calendarId,
                partyId: party.id,
                startsAt: chosen.startsAt,
                notes: notes.trim() || undefined,
                override: chosen.override
            });
            if (!r.ok) {
                setError(r.error);
                if (r.pickAnother) {
                    setChosen(null);
                    setStep('when');
                }
                return;
            }
            setDone(`Booked ${party.name} for ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatSlot"])(Date.parse(r.startsAt), timeZone)}.`);
        });
    };
    const footer = done ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
        className: "w-full",
        onClick: ()=>onOpenChange(false),
        children: "Done"
    }, void 0, false, {
        fileName: "[project]/components/calendar/book-call-sheet.tsx",
        lineNumber: 88,
        columnNumber: 5
    }, this) : step === 'when' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex gap-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                variant: "outline",
                className: "flex-1",
                onClick: ()=>{
                    setStep('who');
                    setChosen(null);
                },
                children: "Back"
            }, void 0, false, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 91,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                className: "flex-1",
                disabled: !chosen,
                onClick: ()=>setStep('confirm'),
                children: "Continue"
            }, void 0, false, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 92,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/book-call-sheet.tsx",
        lineNumber: 90,
        columnNumber: 5
    }, this) : step === 'confirm' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex gap-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                variant: "outline",
                className: "flex-1",
                onClick: ()=>setStep('when'),
                disabled: pending,
                children: "Back"
            }, void 0, false, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                className: "flex-1",
                onClick: book,
                disabled: pending,
                children: pending ? 'Booking…' : 'Book the call'
            }, void 0, false, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 97,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/book-call-sheet.tsx",
        lineNumber: 95,
        columnNumber: 5
    }, this) : undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CalendarPanel"], {
        open: open,
        onOpenChange: onOpenChange,
        title: done ? 'Call booked' : step === 'who' ? `Who is the call with?` : step === 'when' ? 'Pick a time' : 'Confirm the call',
        description: calendarName,
        footer: footer,
        children: [
            error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive",
                role: "alert",
                children: error
            }, void 0, false, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 109,
                columnNumber: 16
            }, this) : null,
            done ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
                role: "status",
                children: [
                    done,
                    " ",
                    calendarKind === 'sales' ? 'They get a confirmation email.' : 'They get a confirmation text and email with a link to reschedule or cancel.'
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 111,
                columnNumber: 9
            }, this) : step === 'who' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                "aria-hidden": true,
                                className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 117,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                type: "search",
                                autoFocus: true,
                                value: query,
                                onChange: (e)=>setQuery(e.target.value),
                                placeholder: `Search ${who}s by name, phone or email`,
                                "aria-label": `Search ${who}s`,
                                className: "pl-9"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 118,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/book-call-sheet.tsx",
                        lineNumber: 116,
                        columnNumber: 11
                    }, this),
                    results === null ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: "Loading…"
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/book-call-sheet.tsx",
                        lineNumber: 129,
                        columnNumber: 13
                    }, this) : results.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: [
                            "No ",
                            who,
                            "s found.",
                            calendarKind === 'contractor' ? ' Only leads assigned to this contractor can be booked here.' : ''
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/book-call-sheet.tsx",
                        lineNumber: 131,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "divide-y overflow-hidden rounded-xl border",
                        "aria-label": `Matching ${who}s`,
                        children: results.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "flex min-h-14 w-full flex-col justify-center px-4 py-2 text-left hover:bg-accent active:bg-accent",
                                    onClick: ()=>{
                                        setParty(p);
                                        setStep('when');
                                        setError(null);
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-sm font-medium",
                                            children: p.name
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                            lineNumber: 143,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs text-muted-foreground",
                                            children: [
                                                p.detail,
                                                p.phone ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calls$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fmtPhone"])(p.phone) : null
                                            ].filter(Boolean).join(' · ') || ' '
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                            lineNumber: 144,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                    lineNumber: 138,
                                    columnNumber: 19
                                }, this)
                            }, p.id, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 137,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/book-call-sheet.tsx",
                        lineNumber: 135,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 115,
                columnNumber: 9
            }, this) : step === 'when' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm",
                        children: [
                            "With ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium",
                                children: party?.name
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 153,
                                columnNumber: 39
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/book-call-sheet.tsx",
                        lineNumber: 153,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$slot$2d$chooser$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SlotChooser"], {
                        calendarId: calendarId,
                        calendarTimeZone: timeZone,
                        allowOverride: allowOverride,
                        value: chosen,
                        onChange: setChosen
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/book-call-sheet.tsx",
                        lineNumber: 154,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 152,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                        className: "grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                className: "text-muted-foreground",
                                children: "With"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 159,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                className: "font-medium",
                                children: party?.name
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 160,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                className: "text-muted-foreground",
                                children: "When"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 161,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                className: "font-medium",
                                children: [
                                    chosen ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatSlot"])(Date.parse(chosen.startsAt), timeZone) : '',
                                    chosen?.override ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "block text-xs font-normal text-amber-700 dark:text-amber-400",
                                        children: "Outside the open times (logged)"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                        lineNumber: 164,
                                        columnNumber: 35
                                    }, this) : null
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 162,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                className: "text-muted-foreground",
                                children: "Calendar"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 166,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                children: calendarName
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 167,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/book-call-sheet.tsx",
                        lineNumber: 158,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                htmlFor: "book-notes",
                                className: "text-sm font-medium",
                                children: "Note for the host (optional)"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 170,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Textarea"], {
                                id: "book-notes",
                                rows: 3,
                                maxLength: 2000,
                                value: notes,
                                onChange: (e)=>setNotes(e.target.value)
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                                lineNumber: 171,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/book-call-sheet.tsx",
                        lineNumber: 169,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 157,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/book-call-sheet.tsx",
        lineNumber: 102,
        columnNumber: 5
    }, this);
}
_s(BookCallSheet, "guQNeM0qIrsJDMiMHFG5VC/HNNc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"]
    ];
});
_c = BookCallSheet;
function BookCallButton({ onClick }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
        onClick: onClick,
        "data-calendar-book": "",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarPlus$3e$__["CalendarPlus"], {
                "aria-hidden": true
            }, void 0, false, {
                fileName: "[project]/components/calendar/book-call-sheet.tsx",
                lineNumber: 183,
                columnNumber: 7
            }, this),
            " Book a call"
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/book-call-sheet.tsx",
        lineNumber: 182,
        columnNumber: 5
    }, this);
}
_c1 = BookCallButton;
var _c, _c1;
__turbopack_context__.k.register(_c, "BookCallSheet");
__turbopack_context__.k.register(_c1, "BookCallButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/actions/data:7eda6b [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"409d4f376493282f5a070ca5346383037a84e6c2b1":"cancelCalendarEvent"},"lib/actions/booking.ts",""] */ __turbopack_context__.s([
    "cancelCalendarEvent",
    ()=>cancelCalendarEvent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var cancelCalendarEvent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("409d4f376493282f5a070ca5346383037a84e6c2b1", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "cancelCalendarEvent"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYm9va2luZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcic7XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgLS0gcm93cyBjb21lIGZyb20gdGhlIHVudHlwZWQgU3VwYWJhc2UgY2xpZW50LCBhcyBlbHNld2hlcmUgaW4gbGliL2RhdGEgKi9cbmltcG9ydCB7IHJldmFsaWRhdGVQYXRoIH0gZnJvbSAnbmV4dC9jYWNoZSc7XG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcbmltcG9ydCB7IHJlcXVpcmVQcm9maWxlIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9zZXJ2ZXInO1xuaW1wb3J0IHsgY3JlYXRlQWRtaW5DbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9hZG1pbic7XG5pbXBvcnQgeyBnZXRTbG90cyB9IGZyb20gJ0AvbGliL2Jvb2tpbmcvc2xvdHMuc2VydmVyJztcbmltcG9ydCB7XG4gIGJvb2tBcHBvaW50bWVudCxcbiAgYm9va1NhbGVzQXBwb2ludG1lbnQsXG4gIGNhbmNlbEFwcG9pbnRtZW50LFxuICBjYW5jZWxTYWxlc0FwcG9pbnRtZW50LFxuICByZXNjaGVkdWxlQXBwb2ludG1lbnQsXG4gIHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50LFxufSBmcm9tICdAL2xpYi9ib29raW5nL2Jvb2suc2VydmVyJztcbmltcG9ydCB7IG5vdGlmeUJvb2tpbmdTb29uIH0gZnJvbSAnQC9saWIvYm9va2luZy9ub3RpZnkuc2VydmVyJztcbmltcG9ydCB7IEJPT0tJTkdfRVJST1JfTUVTU0FHRVMsIG1hcENhbGVuZGFyLCBQSUNLX0FOT1RIRVJfVElNRSwgdHlwZSBCb29raW5nQ2FsZW5kYXIsIHR5cGUgQm9va2luZ0Vycm9yIH0gZnJvbSAnQC9saWIvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgeyBpc1ZhbGlkVGltZVpvbmUgfSBmcm9tICdAL2xpYi9hdmFpbGFiaWxpdHkvdGltZSc7XG5pbXBvcnQgeyBmbHVzaE5vdGlmaWNhdGlvbnNTb29uIH0gZnJvbSAnQC9saWIvbm90aWZpY2F0aW9ucy9vdXRib3gnO1xuaW1wb3J0IHsgZmx1c2hDYWxlbmRhclN5bmNTb29uIH0gZnJvbSAnQC9saWIvY2FsZW5kYXIvc3luYy5zZXJ2ZXInO1xuaW1wb3J0IHsgY2FuTWFuYWdlQ2FsZW5kYXIsIGNhbk92ZXJyaWRlU2xvdHMsIGNhblVzZUNhbGVuZGFyUGFnZSwgY2FuV29ya0NhbGVuZGFyLCB0eXBlIENhbGVuZGFyVmlld2VyIH0gZnJvbSAnQC9jb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcyc7XG5pbXBvcnQgdHlwZSB7IFB1YmxpY1Nsb3QgfSBmcm9tICdAL2NvbXBvbmVudHMvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IFByb2ZpbGUgfSBmcm9tICdAL2xpYi90eXBlcyc7XG5cbi8qKlxuICogSW4tYXBwIGNhbGVuZGFyIGFjdGlvbnMgKGFwcC9hcHAvY2FsZW5kYXIpOiBzbG90cyBmb3IgdGhlIHBpY2tlciwgYm9vayBhXG4gKiBjYWxsIG9uIHNvbWVvbmUncyBiZWhhbGYsIHJlc2NoZWR1bGUsIGNhbmNlbCwgaGVsZCAvIG5vLXNob3csIGFuZCB0aGVcbiAqIGJvb2tpbmctY2FsZW5kYXIgc2V0dGluZ3MuXG4gKlxuICogRXZlcnkgYWN0aW9uIGZpcnN0IHJlYWRzIHRoZSBjYWxlbmRhciAvIGJvb2tpbmcgLyBsZWFkIHRocm91Z2ggdGhlXG4gKiBzaWduZWQtaW4gdXNlcidzIE9XTiBjbGllbnQsIHNvIFJMUyAoMDA2OCkgZGVjaWRlcyB3aGV0aGVyIHRoZXkgbWF5IHNlZSBpdCxcbiAqIHRoZW4gYXBwbGllcyB0aGUgcm9sZSBydWxlcyBpbiBjb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcy50cyAoYSBjb250cmFjdG9yXG4gKiB3b3JrcyBvbmx5IGl0cyBvd24gY2FsZW5kYXIpLiBPbmx5IHRoZW4gZG9lcyB0aGUgc2VydmljZS1yb2xlIGJvb2tpbmcgUlBDXG4gKiBydW4sIHdoaWNoIHJlLWNoZWNrcyB0aGUgc2xvdCB1bmRlciB0aGUgY2FsZW5kYXIgbG9jay4gU3RhdHVzIGNoYW5nZXMgYW5kXG4gKiBzZXR0aW5ncyBzdGF5IG9uIHRoZSB1c2VyJ3MgY2xpZW50IChSTFMgd3JpdGUgcG9saWNpZXMgYXBwbHkgYXMgdGhleSBhcmUpLlxuICogSG9tZW93bmVyIC8gcHJvc3BlY3Qgbm90aWNlcyBnbyBvdXQgYWZ0ZXIgdGhlIHJlc3BvbnNlIChub3RpZnlCb29raW5nU29vbik7XG4gKiBwdXNoIGFuZCBHb29nbGUgc3luYyBjb21lIGZyb20gdGhlIERCIHRyaWdnZXJzIGFuZCBhcmUgZmx1c2hlZCBoZXJlLlxuICovXG5cbmV4cG9ydCB0eXBlIEFjdGlvblJlc3VsdDxUID0gb2JqZWN0PiA9ICh7IG9rOiB0cnVlIH0gJiBUKSB8IHsgb2s6IGZhbHNlOyBlcnJvcjogc3RyaW5nOyBwaWNrQW5vdGhlcj86IGJvb2xlYW4gfTtcbmV4cG9ydCB0eXBlIFNldHRpbmdzU3RhdGUgPSB7IGVycm9yPzogc3RyaW5nOyBzdWNjZXNzPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG5cbnR5cGUgRXZlbnRLaW5kSW5wdXQgPSAnYXBwb2ludG1lbnQnIHwgJ3Zpc2l0JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG5cbi8qKiBIb3N0LWZhY2luZyB3b3JkaW5nICh0aGUgaG9tZW93bmVyIG1lc3NhZ2VzIHNheSBcInlvdVwiOyBzdGFmZiBuZWVkIHRvIGtub3cgd2hhdCBoYXBwZW5lZCkuICovXG5jb25zdCBIT1NUX01FU1NBR0VTOiBQYXJ0aWFsPFJlY29yZDxCb29raW5nRXJyb3IsIHN0cmluZz4+ID0ge1xuICBhbHJlYWR5X2Jvb2tlZDogJ1RoaXMgbGVhZCBhbHJlYWR5IGhhcyBhIGNhbGwgYm9va2VkIGZyb20gdGhlIGZ1bm5lbC4nLFxuICBub3RfYm9va2FibGU6ICdUaGlzIGFwcG9pbnRtZW50IGlzIG5vdCBvbiBhIGJvb2tpbmcgY2FsZW5kYXIuIENoYW5nZSBpdCBmcm9tIHRoZSBsZWFkLicsXG4gIG5vdF9hY3RpdmU6ICdPbmx5IGEgc2NoZWR1bGVkIGNhbGwgY2FuIGJlIGNoYW5nZWQuJyxcbiAgbGVhZF9ub3RfZm91bmQ6ICdMZWFkIG5vdCBmb3VuZC4nLFxuICBhc3NpZ25tZW50X21pc21hdGNoOiAnVGhhdCBsZWFkIGlzIG5vdCBhc3NpZ25lZCB0byB0aGlzIGNvbnRyYWN0b3IuJyxcbiAgd3JvbmdfY2FsZW5kYXI6ICdUaGlzIGxlYWQgY2Fubm90IGJlIGJvb2tlZCBvbiB0aGF0IGNhbGVuZGFyLicsXG4gIGNhbGVuZGFyX2J1c3k6ICdBIGhvc3TigJlzIEdvb2dsZSBDYWxlbmRhciBpcyBidXN5IHRoZW4uIFBpY2sgYW5vdGhlciB0aW1lLicsXG59O1xuY29uc3QgbWVzc2FnZUZvciA9IChlOiBCb29raW5nRXJyb3IpID0+IEhPU1RfTUVTU0FHRVNbZV0gPz8gQk9PS0lOR19FUlJPUl9NRVNTQUdFU1tlXTtcbmNvbnN0IGZhaWxlZCA9IChlOiBCb29raW5nRXJyb3IpOiB7IG9rOiBmYWxzZTsgZXJyb3I6IHN0cmluZzsgcGlja0Fub3RoZXI/OiBib29sZWFuIH0gPT4gKHsgb2s6IGZhbHNlLCBlcnJvcjogbWVzc2FnZUZvcihlKSwgcGlja0Fub3RoZXI6IFBJQ0tfQU5PVEhFUl9USU1FLmhhcyhlKSB8fCB1bmRlZmluZWQgfSk7XG5jb25zdCBkZW5pZWQgPSB7IG9rOiBmYWxzZSBhcyBjb25zdCwgZXJyb3I6ICdZb3UgZG9u4oCZdCBoYXZlIGFjY2VzcyB0byB0aGlzIGNhbGVuZGFyLicgfTtcblxuY29uc3QgdXVpZCA9IHouc3RyaW5nKCkudXVpZCgpO1xuY29uc3QgaXNvID0gei5zdHJpbmcoKS5yZWZpbmUoKHYpID0+IE51bWJlci5pc0Zpbml0ZShEYXRlLnBhcnNlKHYpKSwgJ1BpY2sgYSB2YWxpZCB0aW1lJyk7XG5cbmludGVyZmFjZSBDdHgge1xuICBwcm9maWxlOiBQcm9maWxlO1xuICB2aWV3ZXI6IENhbGVuZGFyVmlld2VyO1xuICB1c2VyRGI6IGFueTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29udGV4dCgpOiBQcm9taXNlPEN0eCB8IG51bGw+IHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGNvbnN0IHZpZXdlcjogQ2FsZW5kYXJWaWV3ZXIgPSB7IGlkOiBwcm9maWxlLmlkLCByb2xlOiBwcm9maWxlLnJvbGUsIGNvbnRyYWN0b3JfaWQ6IHByb2ZpbGUuY29udHJhY3Rvcl9pZCwgY29udHJhY3Rvcl9yb2xlOiBwcm9maWxlLmNvbnRyYWN0b3Jfcm9sZSB9O1xuICBpZiAoIWNhblVzZUNhbGVuZGFyUGFnZSh2aWV3ZXIpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgcHJvZmlsZSwgdmlld2VyLCB1c2VyRGI6IGF3YWl0IGNyZWF0ZUNsaWVudCgpIH07XG59XG5cbi8qKiBUaGUgY2FsZW5kYXIsIHJlYWQgdGhyb3VnaCB0aGUgdXNlcidzIGNsaWVudCAoUkxTKSwgb3IgbnVsbC4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZpc2libGVDYWxlbmRhcih1c2VyRGI6IGFueSwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ0NhbGVuZGFyIHwgbnVsbD4ge1xuICBpZiAoIXV1aWQuc2FmZVBhcnNlKGlkKS5zdWNjZXNzKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCB1c2VyRGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcnMnKS5zZWxlY3QoJyonKS5lcSgnaWQnLCBpZCkubWF5YmVTaW5nbGUoKTtcbiAgcmV0dXJuIGRhdGEgPyBtYXBDYWxlbmRhcihkYXRhKSA6IG51bGw7XG59XG5cbmludGVyZmFjZSBCb29raW5nUmVmIHtcbiAga2luZDogJ2FwcG9pbnRtZW50JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG4gIGlkOiBzdHJpbmc7XG4gIGNhbGVuZGFyOiBCb29raW5nQ2FsZW5kYXIgfCBudWxsO1xuICAvKiogQ29udHJhY3RvciB0aGF0IG93bnMgYSB2aXNpdCAobm8gY2FsZW5kYXIpIHRocm91Z2ggaXRzIGFzc2lnbm1lbnQuICovXG4gIHZpc2l0Q29udHJhY3RvcklkOiBzdHJpbmcgfCBudWxsO1xuICBsZWFkSWQ6IHN0cmluZyB8IG51bGw7XG4gIHNjaGVkdWxlZEF0OiBzdHJpbmcgfCBudWxsO1xuICBzdGF0dXM6IHN0cmluZztcbn1cblxuLyoqIEEgYm9va2luZyB0aGUgdXNlciBjYW4gc2VlIChSTFMpICsgd2hldGhlciB0aGUgcm9sZSBydWxlcyBsZXQgdGhlbSB3b3JrIGl0LiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya2FibGVCb29raW5nKGN0eDogQ3R4LCBraW5kOiBFdmVudEtpbmRJbnB1dCwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ1JlZiB8IG51bGw+IHtcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZShpZCkuc3VjY2VzcykgcmV0dXJuIG51bGw7XG4gIGlmIChraW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ3Byb3NwZWN0X3NhbGVzX2FwcG9pbnRtZW50cycpLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cycpLmVxKCdpZCcsIGlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gICAgLy8gU2FsZXMgbWVldGluZ3MgYXJlIEhvbWVRdW90ZSdzIG93bjogbmV2ZXIgYSBjb250cmFjdG9yJ3MuXG4gICAgaWYgKGN0eC52aWV3ZXIucm9sZSAhPT0gJ2FkbWluJyAmJiBjdHgudmlld2VyLnJvbGUgIT09ICdzZXR0ZXInKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjYWxlbmRhciA9IGRhdGEuY2FsZW5kYXJfaWQgPyBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgZGF0YS5jYWxlbmRhcl9pZCkgOiBudWxsO1xuICAgIHJldHVybiB7IGtpbmQsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IG51bGwsIGxlYWRJZDogbnVsbCwgc2NoZWR1bGVkQXQ6IGRhdGEuc2NoZWR1bGVkX2F0LCBzdGF0dXM6IGRhdGEuc3RhdHVzIH07XG4gIH1cbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiXG4gICAgLmZyb20oJ2FwcG9pbnRtZW50cycpXG4gICAgLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBsZWFkX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cywgYXNzaWdubWVudDpsZWFkX2Fzc2lnbm1lbnRzKGNvbnRyYWN0b3JfaWQsIGxlYWRfaWQpJylcbiAgICAuZXEoJ2lkJywgaWQpXG4gICAgLm1heWJlU2luZ2xlKCk7XG4gIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGFzZyA9IEFycmF5LmlzQXJyYXkoZGF0YS5hc3NpZ25tZW50KSA/IGRhdGEuYXNzaWdubWVudFswXSA6IGRhdGEuYXNzaWdubWVudDtcbiAgY29uc3QgY2FsZW5kYXIgPSBkYXRhLmNhbGVuZGFyX2lkID8gYXdhaXQgdmlzaWJsZUNhbGVuZGFyKGN0eC51c2VyRGIsIGRhdGEuY2FsZW5kYXJfaWQpIDogbnVsbDtcbiAgY29uc3QgcmVmOiBCb29raW5nUmVmID0ge1xuICAgIGtpbmQ6ICdhcHBvaW50bWVudCcsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IGRhdGEuY2FsZW5kYXJfaWQgPyBudWxsIDogYXNnPy5jb250cmFjdG9yX2lkID8/IG51bGwsXG4gICAgbGVhZElkOiBkYXRhLmxlYWRfaWQgPz8gYXNnPy5sZWFkX2lkID8/IG51bGwsIHNjaGVkdWxlZEF0OiBkYXRhLnNjaGVkdWxlZF9hdCwgc3RhdHVzOiBkYXRhLnN0YXR1cyxcbiAgfTtcbiAgaWYgKGNhbGVuZGFyKSByZXR1cm4gY2FuV29ya0NhbGVuZGFyKGN0eC52aWV3ZXIsIGNhbGVuZGFyKSA/IHJlZiA6IG51bGw7XG4gIC8vIEEgdmlzaXQgd2l0aCBubyBjYWxlbmRhcjogc3RhZmYsIG9yIHRoZSBjb250cmFjdG9yIHdob3NlIGFzc2lnbm1lbnQgaXQgaXMuXG4gIGNvbnN0IHN0YWZmID0gY3R4LnZpZXdlci5yb2xlID09PSAnYWRtaW4nIHx8IGN0eC52aWV3ZXIucm9sZSA9PT0gJ3NldHRlcic7XG4gIHJldHVybiBzdGFmZiB8fCAocmVmLnZpc2l0Q29udHJhY3RvcklkICE9PSBudWxsICYmIHJlZi52aXNpdENvbnRyYWN0b3JJZCA9PT0gY3R4LnZpZXdlci5jb250cmFjdG9yX2lkKSA/IHJlZiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGVuZGFyJyk7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2FwcG9pbnRtZW50cycpO1xuICBpZiAobGVhZElkKSB7XG4gICAgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvbGVhZHMnKTtcbiAgICByZXZhbGlkYXRlUGF0aChgL2FwcC9sZWFkcy8ke2xlYWRJZH1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlckNoYW5nZShsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGZsdXNoTm90aWZpY2F0aW9uc1Nvb24oKTtcbiAgZmx1c2hDYWxlbmRhclN5bmNTb29uKCk7XG4gIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhdWRpdE92ZXJyaWRlKGFjdG9ySWQ6IHN0cmluZywgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIC8vIFNlcnZpY2Ugcm9sZTogYXVkaXRfbG9ncyBpcyBpbnNlcnQtcmVzdHJpY3RlZCB0byBhZG1pbnMgYnkgUkxTLCBidXQgc2V0dGVycyBtYXkgb3ZlcnJpZGUgdG9vIChhcyBvbiB0aGUgbGVhZCBwYWdlKS5cbiAgYXdhaXQgY3JlYXRlQWRtaW5DbGllbnQoKS5mcm9tKCdhdWRpdF9sb2dzJykuaW5zZXJ0KHsgYWN0b3JfaWQ6IGFjdG9ySWQsIGFjdGlvbjogJ2FwcG9pbnRtZW50LmF2YWlsYWJpbGl0eV9vdmVycmlkZScsIHRhcmdldF91c2VyX2lkOiBudWxsLCBtZXRhZGF0YSB9KTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBTbG90cyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTbG90c1BheWxvYWQge1xuICBzbG90czogUHVibGljU2xvdFtdO1xuICB0aW1lWm9uZTogc3RyaW5nO1xuICBkdXJhdGlvbk1pbnV0ZXM6IG51bWJlcjtcbiAgLyoqIFRoZSBib29raW5nJ3MgY3VycmVudCBzdGFydCAocmVzY2hlZHVsaW5nKS4gKi9cbiAgY3VycmVudDogc3RyaW5nIHwgbnVsbDtcbn1cblxuLyoqIE9wZW4gdGltZXMgb24gYSBjYWxlbmRhciBmb3IgdGhlIHBpY2tlcjsgd2l0aCBgcmVzY2hlZHVsZWAsIHRoYXQgYm9va2luZydzIG93biB0aW1lIGRvZXMgbm90IGJsb2NrLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENhbGVuZGFyU2xvdHMoaW5wdXQ6IHsgY2FsZW5kYXJJZDogc3RyaW5nOyByZXNjaGVkdWxlPzogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZyB9IH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdDxTbG90c1BheWxvYWQ+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBpbnB1dC5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICBsZXQgY3VycmVudDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIGxldCBleGNsdWRlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGlucHV0LnJlc2NoZWR1bGUpIHtcbiAgICBjb25zdCByZWYgPSBhd2FpdCB3b3JrYWJsZUJvb2tpbmcoY3R4LCBpbnB1dC5yZXNjaGVkdWxlLmtpbmQsIGlucHV0LnJlc2NoZWR1bGUuaWQpO1xuICAgIGlmICghcmVmIHx8IHJlZi5jYWxlbmRhcj8uaWQgIT09IGNhbC5pZCkgcmV0dXJuIGRlbmllZDtcbiAgICBjdXJyZW50ID0gcmVmLnNjaGVkdWxlZEF0ID8gbmV3IERhdGUocmVmLnNjaGVkdWxlZEF0KS50b0lTT1N0cmluZygpIDogbnVsbDtcbiAgICBleGNsdWRlSWQgPSByZWYuaWQ7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCByID0gYXdhaXQgZ2V0U2xvdHMoY2FsLmlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBleGNsdWRlSWQgfSk7XG4gICAgaWYgKCFyKSByZXR1cm4gZGVuaWVkO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHNsb3RzOiByLnNsb3RzLm1hcCgocykgPT4gKHsgc3RhcnQ6IG5ldyBEYXRlKHMuc3RhcnRNcykudG9JU09TdHJpbmcoKSwgZW5kOiBuZXcgRGF0ZShzLmVuZE1zKS50b0lTT1N0cmluZygpIH0pKSxcbiAgICAgIHRpbWVab25lOiByLmNhbGVuZGFyLnRpbWV6b25lLFxuICAgICAgZHVyYXRpb25NaW51dGVzOiByLmNhbGVuZGFyLmR1cmF0aW9uTWludXRlcyxcbiAgICAgIGN1cnJlbnQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhaWxlZCgndW5hdmFpbGFibGUnKTtcbiAgfVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qIFdobyBjYW4gYmUgYm9va2VkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvb2thYmxlUGFydHkge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nIHwgbnVsbDtcbiAgcGhvbmU6IHN0cmluZyB8IG51bGw7XG59XG5cbmNvbnN0IHNlYXJjaElucHV0ID0gei5vYmplY3QoeyBjYWxlbmRhcklkOiB1dWlkLCBxdWVyeTogei5zdHJpbmcoKS50cmltKCkubWF4KDgwKSB9KTtcblxuLyoqXG4gKiBMZWFkcyAoaG9tZW93bmVyIGNhbGVuZGFycykgb3IgY29udHJhY3RvciBwcm9zcGVjdHMgKHNhbGVzIGNhbGVuZGFyKSB0aGVcbiAqIHVzZXIgbWF5IGJvb2ssIG1hdGNoaW5nIGEgbmFtZSAvIHBob25lIC8gZW1haWwuIFJMUyBzY29wZXMgdGhlIHNlYXJjaDpcbiAqIHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdCwgYSBzZXR0ZXJcbiAqIG9ubHkgcHJvc3BlY3RzIGFzc2lnbmVkIHRvIHRoZW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWFyY2hCb29rYWJsZShjYWxlbmRhcklkOiBzdHJpbmcsIHF1ZXJ5OiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvblJlc3VsdDx7IHJlc3VsdHM6IEJvb2thYmxlUGFydHlbXSB9Pj4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBzZWFyY2hJbnB1dC5zYWZlUGFyc2UoeyBjYWxlbmRhcklkLCBxdWVyeSB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IHRydWUsIHJlc3VsdHM6IFtdIH07XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBwYXJzZWQuZGF0YS5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICAvLyBQb3N0Z1JFU1Qgb3ItZmlsdGVyOiBzdHJpcCB0aGUgY2hhcmFjdGVycyB0aGF0IHdvdWxkIGNoYW5nZSBpdHMgbWVhbmluZy5cbiAgY29uc3QgcSA9IHBhcnNlZC5kYXRhLnF1ZXJ5LnJlcGxhY2UoL1ssKCkqJVxcXFxdL2csICcgJykudHJpbSgpO1xuICBjb25zdCBkaWdpdHMgPSBxLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgbGV0IHJlcSA9IGN0eC51c2VyRGIuZnJvbSgnY29udHJhY3Rvcl9wcm9zcGVjdHMnKS5zZWxlY3QoJ2lkLCBjb21wYW55X25hbWUsIGRlY2lzaW9uX21ha2VyX25hbWUsIHBob25lLCBjaXR5Jykub3JkZXIoJ3VwZGF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICAgIGlmIChxKSByZXEgPSByZXEub3IoW2Bjb21wYW55X25hbWUuaWxpa2UuKiR7cX0qYCwgYGRlY2lzaW9uX21ha2VyX25hbWUuaWxpa2UuKiR7cX0qYCwgLi4uKGRpZ2l0cy5sZW5ndGggPj0gMyA/IFtgcGhvbmVfZTE2NC5pbGlrZS4qJHtkaWdpdHN9KmBdIDogW10pXS5qb2luKCcsJykpO1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHJlc3VsdHM6ICgoZGF0YSA/PyBbXSkgYXMgYW55W10pLm1hcCgocCkgPT4gKHtcbiAgICAgICAgaWQ6IHAuaWQsIG5hbWU6IHAuZGVjaXNpb25fbWFrZXJfbmFtZSA/IGAke3AuZGVjaXNpb25fbWFrZXJfbmFtZX0gwrcgJHtwLmNvbXBhbnlfbmFtZX1gIDogcC5jb21wYW55X25hbWUsIGRldGFpbDogcC5jaXR5ID8/IG51bGwsIHBob25lOiBwLnBob25lID8/IG51bGwsXG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIGxldCByZXEgPSBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwaG9uZSwgZW1haWwsIGNpdHksIHZlcnRpY2FsX2lkJykub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICBpZiAoY2FsLmtpbmQgPT09ICdjb250cmFjdG9yJykge1xuICAgIC8vIE9ubHkgbGVhZHMgYXNzaWduZWQgdG8gdGhpcyBjYWxlbmRhcidzIGNvbnRyYWN0b3IgY2FuIGdvIG9uIGl0ICh0aGUgUlBDIGxpbmtzIHRoZSBhc3NpZ25tZW50KS5cbiAgICBjb25zdCB7IGRhdGE6IGFzZyB9ID0gYXdhaXQgY3R4LnVzZXJEYlxuICAgICAgLmZyb20oJ2xlYWRfYXNzaWdubWVudHMnKVxuICAgICAgLnNlbGVjdCgnbGVhZF9pZCcpXG4gICAgICAuZXEoJ2NvbnRyYWN0b3JfaWQnLCBjYWwuY29udHJhY3RvcklkKVxuICAgICAgLm9yZGVyKCdhc3NpZ25lZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLy8gVGhlIG5ld2VzdCAzMDAga2VlcCB0aGUgaWQgbGlzdCB3ZWxsIGluc2lkZSBhIFVSTDsgb2xkZXIgbGVhZHMgYXJlIHJhcmVseSBib29rZWQgZnJvbSBoZXJlLlxuICAgICAgLmxpbWl0KDMwMCk7XG4gICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQoKChhc2cgPz8gW10pIGFzIGFueVtdKS5tYXAoKGEpID0+IGEubGVhZF9pZCBhcyBzdHJpbmcpKV07XG4gICAgaWYgKCFpZHMubGVuZ3RoKSByZXR1cm4geyBvazogdHJ1ZSwgcmVzdWx0czogW10gfTtcbiAgICByZXEgPSByZXEuaW4oJ2lkJywgaWRzKTtcbiAgfVxuICBpZiAocSkge1xuICAgIGNvbnN0IHdvcmRzID0gcS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5zbGljZSgwLCAyKTtcbiAgICBjb25zdCBvcnMgPSBbXG4gICAgICAuLi53b3Jkcy5mbGF0TWFwKCh3KSA9PiBbYGZpcnN0X25hbWUuaWxpa2UuKiR7d30qYCwgYGxhc3RfbmFtZS5pbGlrZS4qJHt3fSpgXSksXG4gICAgICBgZW1haWwuaWxpa2UuKiR7cX0qYCxcbiAgICAgIC4uLihkaWdpdHMubGVuZ3RoID49IDMgPyBbYHBob25lLmlsaWtlLioke2RpZ2l0cy5zbGljZSgtNyl9KmBdIDogW10pLFxuICAgIF07XG4gICAgcmVxID0gcmVxLm9yKG9ycy5qb2luKCcsJykpO1xuICB9XG4gIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICBjb25zdCBsZWFkcyA9IChkYXRhID8/IFtdKSBhcyBhbnlbXTtcbiAgY29uc3QgdmVydGljYWxJZHMgPSBbLi4ubmV3IFNldChsZWFkcy5tYXAoKGwpID0+IGwudmVydGljYWxfaWQpLmZpbHRlcihCb29sZWFuKSldO1xuICBjb25zdCB7IGRhdGE6IHZlcnRpY2FscyB9ID0gdmVydGljYWxJZHMubGVuZ3RoID8gYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCd2ZXJ0aWNhbHMnKS5zZWxlY3QoJ2lkLCBuYW1lJykuaW4oJ2lkJywgdmVydGljYWxJZHMpIDogeyBkYXRhOiBbXSB9O1xuICBjb25zdCB2ZXJ0aWNhbCA9IG5ldyBNYXAoKCh2ZXJ0aWNhbHMgPz8gW10pIGFzIGFueVtdKS5tYXAoKHYpID0+IFt2LmlkIGFzIHN0cmluZywgdi5uYW1lIGFzIHN0cmluZ10pKTtcbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByZXN1bHRzOiBsZWFkcy5tYXAoKGwpID0+ICh7XG4gICAgICBpZDogbC5pZCxcbiAgICAgIG5hbWU6IFtsLmZpcnN0X25hbWUsIGwubGFzdF9uYW1lXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpIHx8IGwucGhvbmUgfHwgbC5lbWFpbCB8fCAnTGVhZCcsXG4gICAgICBkZXRhaWw6IFt2ZXJ0aWNhbC5nZXQobC52ZXJ0aWNhbF9pZCksIGwuY2l0eV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyDCtyAnKSB8fCBudWxsLFxuICAgICAgcGhvbmU6IGwucGhvbmUgPz8gbnVsbCxcbiAgICB9KSksXG4gIH07XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogQm9vayAvIHJlc2NoZWR1bGUgLyBjYW5jZWwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGJvb2tJbnB1dCA9IHoub2JqZWN0KHtcbiAgY2FsZW5kYXJJZDogdXVpZCxcbiAgcGFydHlJZDogdXVpZCxcbiAgc3RhcnRzQXQ6IGlzbyxcbiAgbm90ZXM6IHouc3RyaW5nKCkudHJpbSgpLm1heCgyMDAwKS5vcHRpb25hbCgpLFxuICBvdmVycmlkZTogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogQm9vayBhIGNhbGwgb24gc29tZW9uZSdzIGJlaGFsZjogYSBsZWFkIG9uIGEgaG9tZW93bmVyIGNhbGVuZGFyLCBhIHByb3NwZWN0IG9uIHRoZSBzYWxlcyBjYWxlbmRhci4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBib29rQ2FsbE9uQmVoYWxmKGlucHV0OiB6LmlucHV0PHR5cGVvZiBib29rSW5wdXQ+KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBpZDogc3RyaW5nOyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGJvb2tJbnB1dC5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgYm9va2luZycgfTtcbiAgY29uc3QgeyBjYWxlbmRhcklkLCBwYXJ0eUlkLCBzdGFydHNBdCwgbm90ZXMgfSA9IHBhcnNlZC5kYXRhO1xuICBjb25zdCBjYWwgPSBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgY2FsZW5kYXJJZCk7XG4gIGlmICghY2FsIHx8ICFjYW5Xb3JrQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsKSkgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFjYWwuYWN0aXZlKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnVGhpcyBjYWxlbmRhciBpcyBzd2l0Y2hlZCBvZmYuIFR1cm4gaXQgb24gaW4gaXRzIHNldHRpbmdzIGZpcnN0LicgfTtcbiAgY29uc3Qgb3ZlcnJpZGUgPSAhIXBhcnNlZC5kYXRhLm92ZXJyaWRlICYmIGNhbk92ZXJyaWRlU2xvdHMoY3R4LnZpZXdlcik7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgLy8gUkxTOiBhZG1pbnMgc2VlIGV2ZXJ5IHByb3NwZWN0LCBhIHNldHRlciBvbmx5IHRob3NlIGFzc2lnbmVkIHRvIHRoZW0uXG4gICAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2NvbnRyYWN0b3JfcHJvc3BlY3RzJykuc2VsZWN0KCdpZCwgY29tcGFueV9uYW1lLCBkZWNpc2lvbl9tYWtlcl9uYW1lLCBwaG9uZSwgZW1haWwnKS5lcSgnaWQnLCBwYXJ0eUlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghcCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ1Byb3NwZWN0IG5vdCBmb3VuZC4nIH07XG4gICAgY29uc3QgciA9IGF3YWl0IGJvb2tTYWxlc0FwcG9pbnRtZW50KHtcbiAgICAgIGNhbGVuZGFySWQ6IGNhbC5pZCwgc3RhcnRzQXQsIHByb3NwZWN0SWQ6IHAuaWQsXG4gICAgICAvLyBUaGUgcGVyc29uIGJvb2tpbmcgaXMgY3JlZGl0ZWQsIGFzIGluIHRoZSBjYWxsaW5nIHdvcmtzcGFjZSAoc2V0dGVyIHBheSwgMDA2MikuXG4gICAgICBwYXJ0bmVySWQ6IGN0eC5wcm9maWxlLmlkLCBzb3VyY2U6ICdtYW51YWwnLFxuICAgICAgY29udGFjdDogeyBuYW1lOiBwLmRlY2lzaW9uX21ha2VyX25hbWUgPz8gdW5kZWZpbmVkLCBwaG9uZTogcC5waG9uZSA/PyB1bmRlZmluZWQsIGVtYWlsOiBwLmVtYWlsID8/IHVuZGVmaW5lZCB9LFxuICAgICAgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgICB9KTtcbiAgICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IHNhbGVzX2FwcG9pbnRtZW50X2lkOiByLnNhbGVzQXBwb2ludG1lbnRJZCwgY2FsZW5kYXJfaWQ6IGNhbC5pZCwgc2NoZWR1bGVkX2F0OiByLnN0YXJ0c0F0IH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogJ3NhbGVzX2FwcG9pbnRtZW50JywgaWQ6IHIuc2FsZXNBcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgICBhZnRlckNoYW5nZSgpO1xuICAgIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGxzL2FwcG9pbnRtZW50cycpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5zYWxlc0FwcG9pbnRtZW50SWQsIHN0YXJ0c0F0OiByLnN0YXJ0c0F0IH07XG4gIH1cblxuICAvLyBSTFM6IHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdC5cbiAgY29uc3QgeyBkYXRhOiBsZWFkIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCcpLmVxKCdpZCcsIHBhcnR5SWQpLm1heWJlU2luZ2xlKCk7XG4gIGlmICghbGVhZCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0xlYWQgbm90IGZvdW5kLicgfTtcbiAgY29uc3QgciA9IGF3YWl0IGJvb2tBcHBvaW50bWVudCh7XG4gICAgY2FsZW5kYXJJZDogY2FsLmlkLCBzdGFydHNBdCwgbGVhZElkOiBsZWFkLmlkLCBzb3VyY2U6ICdtYW51YWwnLCBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgfSk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IGFwcG9pbnRtZW50X2lkOiByLmFwcG9pbnRtZW50SWQsIGNhbGVuZGFyX2lkOiBjYWwuaWQsIHNjaGVkdWxlZF9hdDogci5zdGFydHNBdCB9KTtcbiAgbm90aWZ5Qm9va2luZ1Nvb24oeyBraW5kOiAnYXBwb2ludG1lbnQnLCBpZDogci5hcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UobGVhZC5pZCk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5hcHBvaW50bWVudElkLCBzdGFydHNBdDogci5zdGFydHNBdCB9O1xufVxuXG5jb25zdCBjaGFuZ2VJbnB1dCA9IHoub2JqZWN0KHsga2luZDogei5lbnVtKFsnYXBwb2ludG1lbnQnLCAndmlzaXQnLCAnc2FsZXNfYXBwb2ludG1lbnQnXSksIGlkOiB1dWlkIH0pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzY2hlZHVsZUNhbGVuZGFyRXZlbnQoaW5wdXQ6IHsga2luZDogRXZlbnRLaW5kSW5wdXQ7IGlkOiBzdHJpbmc7IHN0YXJ0c0F0OiBzdHJpbmc7IG92ZXJyaWRlPzogYm9vbGVhbiB9KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXJ0c0F0OiBpc28sIG92ZXJyaWRlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpIH0pLnNhZmVQYXJzZShpbnB1dCk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgdmFsaWQgdGltZScgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFyZWYuY2FsZW5kYXIpIHJldHVybiBmYWlsZWQoJ25vdF9ib29rYWJsZScpO1xuICBjb25zdCBvdmVycmlkZSA9ICEhcGFyc2VkLmRhdGEub3ZlcnJpZGUgJiYgY2FuT3ZlcnJpZGVTbG90cyhjdHgudmlld2VyKTtcbiAgY29uc3Qgb3B0cyA9IHsgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIGFjdG9yS2luZDogJ3VzZXInIGFzIGNvbnN0LCBvdmVycmlkZSB9O1xuICBjb25zdCByID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCdcbiAgICA/IGF3YWl0IHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcGFyc2VkLmRhdGEuc3RhcnRzQXQsIG9wdHMpXG4gICAgOiBhd2FpdCByZXNjaGVkdWxlQXBwb2ludG1lbnQocmVmLmlkLCBwYXJzZWQuZGF0YS5zdGFydHNBdCwgb3B0cyk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgY29uc3Qgc3RhcnRzQXQgPSByLnN0YXJ0c0F0ID8/IG5ldyBEYXRlKHBhcnNlZC5kYXRhLnN0YXJ0c0F0KS50b0lTT1N0cmluZygpO1xuICBpZiAoIXIudW5jaGFuZ2VkKSB7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IFtgJHtyZWYua2luZH1faWRgXTogcmVmLmlkLCBjYWxlbmRhcl9pZDogcmVmLmNhbGVuZGFyLmlkLCBzY2hlZHVsZWRfYXQ6IHN0YXJ0c0F0LCByZXNjaGVkdWxlOiB0cnVlIH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogcmVmLmtpbmQsIGlkOiByZWYuaWQsIGNoYW5nZTogJ3Jlc2NoZWR1bGVkJywgcHJldmlvdXNTdGFydHNBdDogci5wcmV2aW91c1N0YXJ0c0F0ID8/IHJlZi5zY2hlZHVsZWRBdCwgYWN0b3JLaW5kOiAndXNlcicgfSk7XG4gIH1cbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBzdGFydHNBdCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FuY2VsQ2FsZW5kYXJFdmVudChpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBjaGFuZ2VJbnB1dC5leHRlbmQoeyByZWFzb246IHouc3RyaW5nKCkudHJpbSgpLm1heCg1MDApLm9wdGlvbmFsKCkgfSkuc2FmZVBhcnNlKGlucHV0KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0NoZWNrIHRoZSBjYW5jZWxsYXRpb24nIH07XG4gIGNvbnN0IHJlZiA9IGF3YWl0IHdvcmthYmxlQm9va2luZyhjdHgsIHBhcnNlZC5kYXRhLmtpbmQsIHBhcnNlZC5kYXRhLmlkKTtcbiAgaWYgKCFyZWYpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHJlYXNvbiA9IHBhcnNlZC5kYXRhLnJlYXNvbiB8fCBudWxsO1xuICBjb25zdCBvcHRzID0geyBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicgYXMgY29uc3QgfTtcbiAgY29uc3QgciA9IHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnXG4gICAgPyBhd2FpdCBjYW5jZWxTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcmVhc29uLCBvcHRzKVxuICAgIDogYXdhaXQgY2FuY2VsQXBwb2ludG1lbnQocmVmLmlkLCByZWFzb24sIG9wdHMpO1xuICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gIC8vIENhbGVuZGFyIGJvb2tpbmdzIHRlbGwgdGhlIGhvbWVvd25lciAvIHByb3NwZWN0OyBhbiBvbi1zaXRlIHZpc2l0J3Mgbm90aWNlcyBzdGF5IHdpdGggaXRzIHdvcmtmbG93cy5cbiAgaWYgKCFyLmFscmVhZHkgJiYgcmVmLmNhbGVuZGFyKSBub3RpZnlCb29raW5nU29vbih7IGtpbmQ6IHJlZi5raW5kLCBpZDogcmVmLmlkLCBjaGFuZ2U6ICdjYW5jZWxsZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlIH07XG59XG5cbmNvbnN0IFNUQVRVU19GT1I6IFJlY29yZDwnYXBwb2ludG1lbnQnIHwgJ3NhbGVzX2FwcG9pbnRtZW50Jywgc3RyaW5nW10+ID0ge1xuICBhcHBvaW50bWVudDogWydoZWxkJywgJ25vX3Nob3cnLCAnc2NoZWR1bGVkJ10sXG4gIHNhbGVzX2FwcG9pbnRtZW50OiBbJ2NvbXBsZXRlZCcsICdub19zaG93JywgJ3NjaGVkdWxlZCddLFxufTtcblxuLyoqIEhlbGQgLyBuby1zaG93IChhbmQgYmFjayB0byBzY2hlZHVsZWQgdG8gdW5kbykuIENhbmNlbGxpbmcgZ29lcyB0aHJvdWdoIGNhbmNlbENhbGVuZGFyRXZlbnQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q2FsZW5kYXJFdmVudFN0YXR1cyhpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgc3RhdHVzOiBzdHJpbmcgfSk6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXR1czogei5zdHJpbmcoKSB9KS5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnUGljayBhIHN0YXR1cycgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgY29uc3Qgc3RhdHVzID0gcGFyc2VkLmRhdGEuc3RhdHVzO1xuICBpZiAoIVNUQVRVU19GT1JbcmVmLmtpbmRdLmluY2x1ZGVzKHN0YXR1cykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgc3RhdHVzJyB9O1xuICBpZiAocmVmLnN0YXR1cyA9PT0gJ2NhbmNlbGxlZCcpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdBIGNhbmNlbGxlZCBjYWxsIGNhbm5vdCBiZSBtYXJrZWQuIEJvb2sgYSBuZXcgb25lIGluc3RlYWQuJyB9O1xuXG4gIC8vIFRoZSB1c2VyJ3Mgb3duIGNsaWVudDogdGhlIGV4aXN0aW5nIFJMUyB3cml0ZSBydWxlcyBkZWNpZGUgKGUuZy4gYSBzZXR0ZXIgZWRpdHMgb25seSBzYWxlcyBtZWV0aW5ncyB0aGV5IGJvb2tlZCkuXG4gIGNvbnN0IHRhYmxlID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCcgPyAncHJvc3BlY3Rfc2FsZXNfYXBwb2ludG1lbnRzJyA6ICdhcHBvaW50bWVudHMnO1xuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20odGFibGUpLnVwZGF0ZSh7IHN0YXR1cyB9KS5lcSgnaWQnLCByZWYuaWQpLnNlbGVjdCgnaWQnKTtcbiAgaWYgKGVycm9yIHx8ICEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiByZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JyA/ICdPbmx5IGFuIGFkbWluIG9yIHRoZSBzZXR0ZXIgd2hvIGJvb2tlZCB0aGlzIG1lZXRpbmcgY2FuIGNoYW5nZSBpdC4nIDogJ1RoaXMgYXBwb2ludG1lbnQgY291bGQgbm90IGJlIHVwZGF0ZWQuJyB9O1xuICB9XG5cbiAgaWYgKHJlZi5raW5kID09PSAnYXBwb2ludG1lbnQnICYmIHJlZi5sZWFkSWQgJiYgc3RhdHVzID09PSAnaGVsZCcpIHtcbiAgICAvLyBBIGhlbGQgY2FsbCB3aXRoIHRoZSBIb21lUXVvdGUgdGVhbSBpcyBub3QgdGhlIGNvbnRyYWN0b3IgYXBwb2ludG1lbnQ6IHRoZSBsZWFkJ3Mgc3RhZ2Ugc3RheXMgd2hlcmUgaXQgaXMuXG4gICAgY29uc3QgdGVhbUNhbGwgPSByZWYuY2FsZW5kYXI/LmtpbmQgPT09ICd0ZWFtJztcbiAgICBpZiAoIXRlYW1DYWxsKSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykudXBkYXRlKHsgc3RhdHVzOiAnYXBwb2ludG1lbnRfY29tcGxldGVkJyB9KS5lcSgnaWQnLCByZWYubGVhZElkKTtcbiAgICBjb25zdCBjb250cmFjdG9ySWQgPSByZWYuY2FsZW5kYXI/LmNvbnRyYWN0b3JJZCA/PyByZWYudmlzaXRDb250cmFjdG9ySWQ7XG4gICAgYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCdsZWFkX2FjdGl2aXRpZXMnKS5pbnNlcnQoe1xuICAgICAgbGVhZF9pZDogcmVmLmxlYWRJZCwgYWN0b3JfaWQ6IGN0eC5wcm9maWxlLmlkLCB0eXBlOiAnYXBwb2ludG1lbnQnLCBib2R5OiB0ZWFtQ2FsbCA/ICdDYWxsIHdpdGggdGhlIEhvbWVRdW90ZSB0ZWFtIGhlbGQnIDogJ0FwcG9pbnRtZW50IGNvbXBsZXRlZCcsXG4gICAgICAvLyBDb250cmFjdG9yLWF1dGhvcmVkIGVudHJpZXMgbXVzdCBuYW1lIHRoZWlyIG93biBjb21wYW55IChhY3Rpdml0aWVzX2luc2VydCBSTFMpLlxuICAgICAgbWV0YWRhdGE6IHsgYXBwb2ludG1lbnRfaWQ6IHJlZi5pZCwgLi4uKGNvbnRyYWN0b3JJZCA/IHsgY29udHJhY3Rvcl9pZDogY29udHJhY3RvcklkIH0gOiB7fSkgfSxcbiAgICB9KTtcbiAgfVxuICBhZnRlckNoYW5nZShyZWYubGVhZElkKTtcbiAgaWYgKHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSByZXZhbGlkYXRlUGF0aCgnL2FwcC9jYWxscy9hcHBvaW50bWVudHMnKTtcbiAgcmV0dXJuIHsgb2s6IHRydWUgfTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBDYWxlbmRhciBzZXR0aW5ncyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQ6IHN0cmluZyk6IFByb21pc2U8eyBjdHg6IEN0eDsgY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciB9IHwgeyBlcnJvcjogc3RyaW5nIH0+IHtcbiAgY29uc3QgY3R4ID0gYXdhaXQgY29udGV4dCgpO1xuICBpZiAoIWN0eCkgcmV0dXJuIHsgZXJyb3I6IGRlbmllZC5lcnJvciB9O1xuICBjb25zdCBjYWxlbmRhciA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBjYWxlbmRhcklkKTtcbiAgaWYgKCFjYWxlbmRhcikgcmV0dXJuIHsgZXJyb3I6ICdDYWxlbmRhciBub3QgZm91bmQnIH07XG4gIGlmICghY2FuTWFuYWdlQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsZW5kYXIpKSByZXR1cm4geyBlcnJvcjogJ09ubHkgYSBIb21lUXVvdGUgYWRtaW4gb3IgdGhlIGNvbXBhbnkgb3duZXIgY2FuIGNoYW5nZSB0aGlzIGNhbGVuZGFyLicgfTtcbiAgcmV0dXJuIHsgY3R4LCBjYWxlbmRhciB9O1xufVxuXG5jb25zdCBmaWVsZCA9IChmOiBGb3JtRGF0YSwgazogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHYgPSBmLmdldChrKTtcbiAgcmV0dXJuIHYgPT09IG51bGwgPyBudWxsIDogU3RyaW5nKHYpLnRyaW0oKTtcbn07XG5jb25zdCBpbnRGaWVsZCA9IChsbzogbnVtYmVyLCBoaTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpID0+IHouY29lcmNlLm51bWJlcih7IGludmFsaWRfdHlwZV9lcnJvcjogbWVzc2FnZSB9KS5pbnQobWVzc2FnZSkubWluKGxvLCBtZXNzYWdlKS5tYXgoaGksIG1lc3NhZ2UpO1xuXG5jb25zdCBzZXR0aW5nc1NjaGVtYSA9IHpcbiAgLm9iamVjdCh7XG4gICAgbmFtZTogei5zdHJpbmcoKS5taW4oMSwgJ0dpdmUgdGhlIGNhbGVuZGFyIGEgbmFtZScpLm1heCgxMjAsICdVc2UgMTIwIGNoYXJhY3RlcnMgb3IgZmV3ZXInKSxcbiAgICB0aW1lem9uZTogei5zdHJpbmcoKS5yZWZpbmUoaXNWYWxpZFRpbWVab25lLCAnUGljayBhIHZhbGlkIHRpbWUgem9uZScpLFxuICAgIGR1cmF0aW9uX21pbnV0ZXM6IGludEZpZWxkKDEwLCAyNDAsICdDYWxsIGxlbmd0aCBtdXN0IGJlIDEw4oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogaW50RmllbGQoNSwgMjQwLCAnU3RhcnQgdGltZXMgbXVzdCBiZSBldmVyeSA14oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBidWZmZXJfbWludXRlczogaW50RmllbGQoMCwgMjQwLCAnQnVmZmVyIG11c3QgYmUgMOKAkzI0MCBtaW51dGVzJyksXG4gICAgbWluX25vdGljZV9taW51dGVzOiBpbnRGaWVsZCgwLCA0MzIwMCwgJ01pbmltdW0gbm90aWNlIG11c3QgYmUgMOKAkzcyMCBob3VycycpLFxuICAgIGhvcml6b25fZGF5czogaW50RmllbGQoMSwgMTIwLCAnQm9vayBhaGVhZCBtdXN0IGJlIDHigJMxMjAgZGF5cycpLFxuICAgIG1heF9wZXJfZGF5OiBpbnRGaWVsZCgxLCAxMDAsICdNYXggcGVyIGRheSBtdXN0IGJlIDHigJMxMDAnKS5udWxsYWJsZSgpLFxuICAgIG1lZXRpbmdfdHlwZTogei5lbnVtKFsncGhvbmUnLCAndmlkZW8nXSksXG4gICAgdmlkZW9fbGluazogei5zdHJpbmcoKS5tYXgoNTAwKS5yZWdleCgvXmh0dHBzOlxcL1xcLy8sICdUaGUgdmlkZW8gbGluayBtdXN0IHN0YXJ0IHdpdGggaHR0cHM6Ly8nKS5udWxsYWJsZSgpLFxuICAgIGFjdGl2ZTogei5ib29sZWFuKCksXG4gIH0pXG4gIC5yZWZpbmUoKHMpID0+IHMubWVldGluZ190eXBlICE9PSAndmlkZW8nIHx8ICEhcy52aWRlb19saW5rLCB7IG1lc3NhZ2U6ICdBZGQgdGhlIHZpZGVvIGxpbmsgY2FsbGVycyB3aWxsIGpvaW4nLCBwYXRoOiBbJ3ZpZGVvX2xpbmsnXSB9KTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJTZXR0aW5ncyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgY29uc3Qgbm90aWNlID0gZmllbGQoZm9ybURhdGEsICdtaW5fbm90aWNlX2hvdXJzJyk7XG4gIGNvbnN0IHBhcnNlZCA9IHNldHRpbmdzU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgbmFtZTogZmllbGQoZm9ybURhdGEsICduYW1lJyksXG4gICAgdGltZXpvbmU6IGZpZWxkKGZvcm1EYXRhLCAndGltZXpvbmUnKSxcbiAgICBkdXJhdGlvbl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2R1cmF0aW9uX21pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogZmllbGQoZm9ybURhdGEsICdzbG90X3N0ZXBfbWludXRlcycpLFxuICAgIGJ1ZmZlcl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2J1ZmZlcl9taW51dGVzJykgfHwgMCxcbiAgICBtaW5fbm90aWNlX21pbnV0ZXM6IG5vdGljZSA/IE1hdGgucm91bmQoTnVtYmVyKG5vdGljZSkgKiA2MCkgOiAwLFxuICAgIGhvcml6b25fZGF5czogZmllbGQoZm9ybURhdGEsICdob3Jpem9uX2RheXMnKSxcbiAgICBtYXhfcGVyX2RheTogZmllbGQoZm9ybURhdGEsICdtYXhfcGVyX2RheScpIHx8IG51bGwsXG4gICAgbWVldGluZ190eXBlOiBmaWVsZChmb3JtRGF0YSwgJ21lZXRpbmdfdHlwZScpLFxuICAgIHZpZGVvX2xpbms6IGZpZWxkKGZvcm1EYXRhLCAndmlkZW9fbGluaycpIHx8IG51bGwsXG4gICAgYWN0aXZlOiBmb3JtRGF0YS5nZXQoJ2FjdGl2ZScpID09PSAnb24nLFxuICB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgZXJyb3I6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgPz8gJ0NoZWNrIHRoZSBzZXR0aW5ncycgfTtcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJzJykudXBkYXRlKHBhcnNlZC5kYXRhKS5lcSgnaWQnLCBtLmNhbGVuZGFyLmlkKS5zZWxlY3QoJ2lkJyk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgaWYgKCEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHJldHVybiB7IGVycm9yOiAnWW91IGNhbuKAmXQgY2hhbmdlIHRoaXMgY2FsZW5kYXIuJyB9O1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbiAgcmV0dXJuIHsgc3VjY2VzczogJ1NldHRpbmdzIHNhdmVkJyB9O1xufVxuXG5jb25zdCBydWxlU2NoZW1hID0gelxuICAub2JqZWN0KHsgd2Vla2RheTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDYpLCBzdGFydE1pbnV0ZTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDE0MzkpLCBlbmRNaW51dGU6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgxNDQwKSB9KVxuICAucmVmaW5lKChyKSA9PiByLmVuZE1pbnV0ZSA+IHIuc3RhcnRNaW51dGUsICdFbmQgdGltZSBtdXN0IGJlIGFmdGVyIHN0YXJ0IHRpbWUnKTtcblxuLyoqIFJlcGxhY2UgdGhlIGNhbGVuZGFyJ3Mgd2Vla2x5IGhvdXJzIChXZWVrbHlFZGl0b3IncyBgcnVsZXNgIEpTT04pLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJSdWxlcyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgbGV0IHJhdzogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICByYXcgPSBKU09OLnBhcnNlKFN0cmluZyhmb3JtRGF0YS5nZXQoJ3J1bGVzJykgPz8gJ1tdJykpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIHRoZSBob3VycycgfTtcbiAgfVxuICBjb25zdCBwYXJzZWQgPSB6LmFycmF5KHJ1bGVTY2hlbWEpLm1heCg1MCkuc2FmZVBhcnNlKHJhdyk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgaG91cnMnIH07XG4gIGNvbnN0IHJ1bGVzID0gcGFyc2VkLmRhdGE7XG4gIGZvciAobGV0IGQgPSAwOyBkIDwgNzsgZCsrKSB7XG4gICAgY29uc3QgZGF5ID0gcnVsZXMuZmlsdGVyKChyKSA9PiByLndlZWtkYXkgPT09IGQpLnNvcnQoKGEsIGIpID0+IGEuc3RhcnRNaW51dGUgLSBiLnN0YXJ0TWludXRlKTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGRheS5sZW5ndGg7IGkrKykgaWYgKGRheVtpXS5zdGFydE1pbnV0ZSA8IGRheVtpIC0gMV0uZW5kTWludXRlKSByZXR1cm4geyBlcnJvcjogJ0hvdXJzIG9uIHRoZSBzYW1lIGRheSBvdmVybGFwJyB9O1xuICB9XG4gIGNvbnN0IGRiID0gbS5jdHgudXNlckRiO1xuICBjb25zdCB7IGVycm9yOiBkZWxFcnJvciB9ID0gYXdhaXQgZGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcl9ydWxlcycpLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpO1xuICBpZiAoZGVsRXJyb3IpIHJldHVybiB7IGVycm9yOiBkZWxFcnJvci5tZXNzYWdlIH07XG4gIGlmIChydWxlcy5sZW5ndGgpIHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBkYi5mcm9tKCdib29raW5nX2NhbGVuZGFyX3J1bGVzJykuaW5zZXJ0KFxuICAgICAgcnVsZXMubWFwKChyKSA9PiAoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgd2Vla2RheTogci53ZWVrZGF5LCBzdGFydF9taW51dGU6IHIuc3RhcnRNaW51dGUsIGVuZF9taW51dGU6IHIuZW5kTWludXRlIH0pKVxuICAgICk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4geyBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG4gIHJlZnJlc2hDYWxlbmRhcigpO1xuICByZXR1cm4geyBzdWNjZXNzOiBydWxlcy5sZW5ndGggPyAnSG91cnMgc2F2ZWQnIDogJ0hvdXJzIGNsZWFyZWQ6IG5vdGhpbmcgY2FuIGJlIGJvb2tlZCB1bnRpbCB5b3UgYWRkIHNvbWUnIH07XG59XG5cbi8qKiBQZW9wbGUgd2hvIG1heSBob3N0IGEgY2FsZW5kYXI6IHRlYW0gLyBzYWxlcyB0YWtlIEhvbWVRdW90ZSBhZG1pbnMgKyBzZXR0ZXJzOyBhIGNvbnRyYWN0b3IgY2FsZW5kYXIgaXRzIG93biBjb21wYW55J3MgdXNlcnMuICovXG5hc3luYyBmdW5jdGlvbiBlbGlnaWJsZUhvc3QoY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciwgdXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjcmVhdGVBZG1pbkNsaWVudCgpLmZyb20oJ3Byb2ZpbGVzJykuc2VsZWN0KCdpZCwgcm9sZSwgY29udHJhY3Rvcl9pZCwgaXNfYWN0aXZlJykuZXEoJ2lkJywgdXNlcklkKS5tYXliZVNpbmdsZSgpO1xuICBpZiAoIXAgfHwgcC5pc19hY3RpdmUgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBjYWxlbmRhci5raW5kID09PSAnY29udHJhY3RvcicgPyBwLnJvbGUgPT09ICdjb250cmFjdG9yJyAmJiBwLmNvbnRyYWN0b3JfaWQgPT09IGNhbGVuZGFyLmNvbnRyYWN0b3JJZCA6IHAucm9sZSA9PT0gJ2FkbWluJyB8fCBwLnJvbGUgPT09ICdzZXR0ZXInO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQm9va2luZ0NhbGVuZGFyTWVtYmVyKGNhbGVuZGFySWQ6IHN0cmluZywgX3ByZXY6IFNldHRpbmdzU3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8U2V0dGluZ3NTdGF0ZT4ge1xuICBjb25zdCBtID0gYXdhaXQgbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQpO1xuICBpZiAoJ2Vycm9yJyBpbiBtKSByZXR1cm4geyBlcnJvcjogbS5lcnJvciB9O1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZSh1c2VySWQpLnN1Y2Nlc3MgfHwgIShhd2FpdCBlbGlnaWJsZUhvc3QobS5jYWxlbmRhciwgdXNlcklkKSkpIHJldHVybiB7IGVycm9yOiAnUGljayBhIHBlcnNvbiB0byBhZGQnIH07XG4gIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IG0uY3R4LnVzZXJEYlxuICAgIC5mcm9tKCdib29raW5nX2NhbGVuZGFyX21lbWJlcnMnKVxuICAgIC51cHNlcnQoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgdXNlcl9pZDogdXNlcklkLCBub3RpZnk6IHRydWUgfSwgeyBvbkNvbmZsaWN0OiAnY2FsZW5kYXJfaWQsdXNlcl9pZCcgfSk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgcmVmcmVzaENhbGVuZGFyKCk7XG4gIHJldHVybiB7IHN1Y2Nlc3M6ICdIb3N0IGFkZGVkJyB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va2luZ0NhbGVuZGFyTWVtYmVyKGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjYWxlbmRhcklkID0gZmllbGQoZm9ybURhdGEsICdjYWxlbmRhcl9pZCcpID8/ICcnO1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgY29uc3Qgb3AgPSBmaWVsZChmb3JtRGF0YSwgJ29wJyk7XG4gIGNvbnN0IG0gPSBhd2FpdCBtYW5hZ2VhYmxlQ2FsZW5kYXIoY2FsZW5kYXJJZCk7XG4gIGlmICgnZXJyb3InIGluIG0gfHwgIXV1aWQuc2FmZVBhcnNlKHVzZXJJZCkuc3VjY2VzcykgcmV0dXJuO1xuICBjb25zdCBtZW1iZXJzID0gbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJfbWVtYmVycycpO1xuICBpZiAob3AgPT09ICdyZW1vdmUnKSBhd2FpdCBtZW1iZXJzLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpLmVxKCd1c2VyX2lkJywgdXNlcklkKTtcbiAgZWxzZSBpZiAob3AgPT09ICdub3RpZnlfb24nIHx8IG9wID09PSAnbm90aWZ5X29mZicpIGF3YWl0IG1lbWJlcnMudXBkYXRlKHsgbm90aWZ5OiBvcCA9PT0gJ25vdGlmeV9vbicgfSkuZXEoJ2NhbGVuZGFyX2lkJywgbS5jYWxlbmRhci5pZCkuZXEoJ3VzZXJfaWQnLCB1c2VySWQpO1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoibVNBMlZzQiJ9
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/actions/data:837f39 [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"407a8fd17faa3c751822facbeb7d14b5e4be7a91d6":"rescheduleCalendarEvent"},"lib/actions/booking.ts",""] */ __turbopack_context__.s([
    "rescheduleCalendarEvent",
    ()=>rescheduleCalendarEvent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var rescheduleCalendarEvent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("407a8fd17faa3c751822facbeb7d14b5e4be7a91d6", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "rescheduleCalendarEvent"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYm9va2luZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcic7XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgLS0gcm93cyBjb21lIGZyb20gdGhlIHVudHlwZWQgU3VwYWJhc2UgY2xpZW50LCBhcyBlbHNld2hlcmUgaW4gbGliL2RhdGEgKi9cbmltcG9ydCB7IHJldmFsaWRhdGVQYXRoIH0gZnJvbSAnbmV4dC9jYWNoZSc7XG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcbmltcG9ydCB7IHJlcXVpcmVQcm9maWxlIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9zZXJ2ZXInO1xuaW1wb3J0IHsgY3JlYXRlQWRtaW5DbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9hZG1pbic7XG5pbXBvcnQgeyBnZXRTbG90cyB9IGZyb20gJ0AvbGliL2Jvb2tpbmcvc2xvdHMuc2VydmVyJztcbmltcG9ydCB7XG4gIGJvb2tBcHBvaW50bWVudCxcbiAgYm9va1NhbGVzQXBwb2ludG1lbnQsXG4gIGNhbmNlbEFwcG9pbnRtZW50LFxuICBjYW5jZWxTYWxlc0FwcG9pbnRtZW50LFxuICByZXNjaGVkdWxlQXBwb2ludG1lbnQsXG4gIHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50LFxufSBmcm9tICdAL2xpYi9ib29raW5nL2Jvb2suc2VydmVyJztcbmltcG9ydCB7IG5vdGlmeUJvb2tpbmdTb29uIH0gZnJvbSAnQC9saWIvYm9va2luZy9ub3RpZnkuc2VydmVyJztcbmltcG9ydCB7IEJPT0tJTkdfRVJST1JfTUVTU0FHRVMsIG1hcENhbGVuZGFyLCBQSUNLX0FOT1RIRVJfVElNRSwgdHlwZSBCb29raW5nQ2FsZW5kYXIsIHR5cGUgQm9va2luZ0Vycm9yIH0gZnJvbSAnQC9saWIvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgeyBpc1ZhbGlkVGltZVpvbmUgfSBmcm9tICdAL2xpYi9hdmFpbGFiaWxpdHkvdGltZSc7XG5pbXBvcnQgeyBmbHVzaE5vdGlmaWNhdGlvbnNTb29uIH0gZnJvbSAnQC9saWIvbm90aWZpY2F0aW9ucy9vdXRib3gnO1xuaW1wb3J0IHsgZmx1c2hDYWxlbmRhclN5bmNTb29uIH0gZnJvbSAnQC9saWIvY2FsZW5kYXIvc3luYy5zZXJ2ZXInO1xuaW1wb3J0IHsgY2FuTWFuYWdlQ2FsZW5kYXIsIGNhbk92ZXJyaWRlU2xvdHMsIGNhblVzZUNhbGVuZGFyUGFnZSwgY2FuV29ya0NhbGVuZGFyLCB0eXBlIENhbGVuZGFyVmlld2VyIH0gZnJvbSAnQC9jb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcyc7XG5pbXBvcnQgdHlwZSB7IFB1YmxpY1Nsb3QgfSBmcm9tICdAL2NvbXBvbmVudHMvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IFByb2ZpbGUgfSBmcm9tICdAL2xpYi90eXBlcyc7XG5cbi8qKlxuICogSW4tYXBwIGNhbGVuZGFyIGFjdGlvbnMgKGFwcC9hcHAvY2FsZW5kYXIpOiBzbG90cyBmb3IgdGhlIHBpY2tlciwgYm9vayBhXG4gKiBjYWxsIG9uIHNvbWVvbmUncyBiZWhhbGYsIHJlc2NoZWR1bGUsIGNhbmNlbCwgaGVsZCAvIG5vLXNob3csIGFuZCB0aGVcbiAqIGJvb2tpbmctY2FsZW5kYXIgc2V0dGluZ3MuXG4gKlxuICogRXZlcnkgYWN0aW9uIGZpcnN0IHJlYWRzIHRoZSBjYWxlbmRhciAvIGJvb2tpbmcgLyBsZWFkIHRocm91Z2ggdGhlXG4gKiBzaWduZWQtaW4gdXNlcidzIE9XTiBjbGllbnQsIHNvIFJMUyAoMDA2OCkgZGVjaWRlcyB3aGV0aGVyIHRoZXkgbWF5IHNlZSBpdCxcbiAqIHRoZW4gYXBwbGllcyB0aGUgcm9sZSBydWxlcyBpbiBjb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcy50cyAoYSBjb250cmFjdG9yXG4gKiB3b3JrcyBvbmx5IGl0cyBvd24gY2FsZW5kYXIpLiBPbmx5IHRoZW4gZG9lcyB0aGUgc2VydmljZS1yb2xlIGJvb2tpbmcgUlBDXG4gKiBydW4sIHdoaWNoIHJlLWNoZWNrcyB0aGUgc2xvdCB1bmRlciB0aGUgY2FsZW5kYXIgbG9jay4gU3RhdHVzIGNoYW5nZXMgYW5kXG4gKiBzZXR0aW5ncyBzdGF5IG9uIHRoZSB1c2VyJ3MgY2xpZW50IChSTFMgd3JpdGUgcG9saWNpZXMgYXBwbHkgYXMgdGhleSBhcmUpLlxuICogSG9tZW93bmVyIC8gcHJvc3BlY3Qgbm90aWNlcyBnbyBvdXQgYWZ0ZXIgdGhlIHJlc3BvbnNlIChub3RpZnlCb29raW5nU29vbik7XG4gKiBwdXNoIGFuZCBHb29nbGUgc3luYyBjb21lIGZyb20gdGhlIERCIHRyaWdnZXJzIGFuZCBhcmUgZmx1c2hlZCBoZXJlLlxuICovXG5cbmV4cG9ydCB0eXBlIEFjdGlvblJlc3VsdDxUID0gb2JqZWN0PiA9ICh7IG9rOiB0cnVlIH0gJiBUKSB8IHsgb2s6IGZhbHNlOyBlcnJvcjogc3RyaW5nOyBwaWNrQW5vdGhlcj86IGJvb2xlYW4gfTtcbmV4cG9ydCB0eXBlIFNldHRpbmdzU3RhdGUgPSB7IGVycm9yPzogc3RyaW5nOyBzdWNjZXNzPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG5cbnR5cGUgRXZlbnRLaW5kSW5wdXQgPSAnYXBwb2ludG1lbnQnIHwgJ3Zpc2l0JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG5cbi8qKiBIb3N0LWZhY2luZyB3b3JkaW5nICh0aGUgaG9tZW93bmVyIG1lc3NhZ2VzIHNheSBcInlvdVwiOyBzdGFmZiBuZWVkIHRvIGtub3cgd2hhdCBoYXBwZW5lZCkuICovXG5jb25zdCBIT1NUX01FU1NBR0VTOiBQYXJ0aWFsPFJlY29yZDxCb29raW5nRXJyb3IsIHN0cmluZz4+ID0ge1xuICBhbHJlYWR5X2Jvb2tlZDogJ1RoaXMgbGVhZCBhbHJlYWR5IGhhcyBhIGNhbGwgYm9va2VkIGZyb20gdGhlIGZ1bm5lbC4nLFxuICBub3RfYm9va2FibGU6ICdUaGlzIGFwcG9pbnRtZW50IGlzIG5vdCBvbiBhIGJvb2tpbmcgY2FsZW5kYXIuIENoYW5nZSBpdCBmcm9tIHRoZSBsZWFkLicsXG4gIG5vdF9hY3RpdmU6ICdPbmx5IGEgc2NoZWR1bGVkIGNhbGwgY2FuIGJlIGNoYW5nZWQuJyxcbiAgbGVhZF9ub3RfZm91bmQ6ICdMZWFkIG5vdCBmb3VuZC4nLFxuICBhc3NpZ25tZW50X21pc21hdGNoOiAnVGhhdCBsZWFkIGlzIG5vdCBhc3NpZ25lZCB0byB0aGlzIGNvbnRyYWN0b3IuJyxcbiAgd3JvbmdfY2FsZW5kYXI6ICdUaGlzIGxlYWQgY2Fubm90IGJlIGJvb2tlZCBvbiB0aGF0IGNhbGVuZGFyLicsXG4gIGNhbGVuZGFyX2J1c3k6ICdBIGhvc3TigJlzIEdvb2dsZSBDYWxlbmRhciBpcyBidXN5IHRoZW4uIFBpY2sgYW5vdGhlciB0aW1lLicsXG59O1xuY29uc3QgbWVzc2FnZUZvciA9IChlOiBCb29raW5nRXJyb3IpID0+IEhPU1RfTUVTU0FHRVNbZV0gPz8gQk9PS0lOR19FUlJPUl9NRVNTQUdFU1tlXTtcbmNvbnN0IGZhaWxlZCA9IChlOiBCb29raW5nRXJyb3IpOiB7IG9rOiBmYWxzZTsgZXJyb3I6IHN0cmluZzsgcGlja0Fub3RoZXI/OiBib29sZWFuIH0gPT4gKHsgb2s6IGZhbHNlLCBlcnJvcjogbWVzc2FnZUZvcihlKSwgcGlja0Fub3RoZXI6IFBJQ0tfQU5PVEhFUl9USU1FLmhhcyhlKSB8fCB1bmRlZmluZWQgfSk7XG5jb25zdCBkZW5pZWQgPSB7IG9rOiBmYWxzZSBhcyBjb25zdCwgZXJyb3I6ICdZb3UgZG9u4oCZdCBoYXZlIGFjY2VzcyB0byB0aGlzIGNhbGVuZGFyLicgfTtcblxuY29uc3QgdXVpZCA9IHouc3RyaW5nKCkudXVpZCgpO1xuY29uc3QgaXNvID0gei5zdHJpbmcoKS5yZWZpbmUoKHYpID0+IE51bWJlci5pc0Zpbml0ZShEYXRlLnBhcnNlKHYpKSwgJ1BpY2sgYSB2YWxpZCB0aW1lJyk7XG5cbmludGVyZmFjZSBDdHgge1xuICBwcm9maWxlOiBQcm9maWxlO1xuICB2aWV3ZXI6IENhbGVuZGFyVmlld2VyO1xuICB1c2VyRGI6IGFueTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29udGV4dCgpOiBQcm9taXNlPEN0eCB8IG51bGw+IHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGNvbnN0IHZpZXdlcjogQ2FsZW5kYXJWaWV3ZXIgPSB7IGlkOiBwcm9maWxlLmlkLCByb2xlOiBwcm9maWxlLnJvbGUsIGNvbnRyYWN0b3JfaWQ6IHByb2ZpbGUuY29udHJhY3Rvcl9pZCwgY29udHJhY3Rvcl9yb2xlOiBwcm9maWxlLmNvbnRyYWN0b3Jfcm9sZSB9O1xuICBpZiAoIWNhblVzZUNhbGVuZGFyUGFnZSh2aWV3ZXIpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgcHJvZmlsZSwgdmlld2VyLCB1c2VyRGI6IGF3YWl0IGNyZWF0ZUNsaWVudCgpIH07XG59XG5cbi8qKiBUaGUgY2FsZW5kYXIsIHJlYWQgdGhyb3VnaCB0aGUgdXNlcidzIGNsaWVudCAoUkxTKSwgb3IgbnVsbC4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZpc2libGVDYWxlbmRhcih1c2VyRGI6IGFueSwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ0NhbGVuZGFyIHwgbnVsbD4ge1xuICBpZiAoIXV1aWQuc2FmZVBhcnNlKGlkKS5zdWNjZXNzKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCB1c2VyRGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcnMnKS5zZWxlY3QoJyonKS5lcSgnaWQnLCBpZCkubWF5YmVTaW5nbGUoKTtcbiAgcmV0dXJuIGRhdGEgPyBtYXBDYWxlbmRhcihkYXRhKSA6IG51bGw7XG59XG5cbmludGVyZmFjZSBCb29raW5nUmVmIHtcbiAga2luZDogJ2FwcG9pbnRtZW50JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG4gIGlkOiBzdHJpbmc7XG4gIGNhbGVuZGFyOiBCb29raW5nQ2FsZW5kYXIgfCBudWxsO1xuICAvKiogQ29udHJhY3RvciB0aGF0IG93bnMgYSB2aXNpdCAobm8gY2FsZW5kYXIpIHRocm91Z2ggaXRzIGFzc2lnbm1lbnQuICovXG4gIHZpc2l0Q29udHJhY3RvcklkOiBzdHJpbmcgfCBudWxsO1xuICBsZWFkSWQ6IHN0cmluZyB8IG51bGw7XG4gIHNjaGVkdWxlZEF0OiBzdHJpbmcgfCBudWxsO1xuICBzdGF0dXM6IHN0cmluZztcbn1cblxuLyoqIEEgYm9va2luZyB0aGUgdXNlciBjYW4gc2VlIChSTFMpICsgd2hldGhlciB0aGUgcm9sZSBydWxlcyBsZXQgdGhlbSB3b3JrIGl0LiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya2FibGVCb29raW5nKGN0eDogQ3R4LCBraW5kOiBFdmVudEtpbmRJbnB1dCwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ1JlZiB8IG51bGw+IHtcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZShpZCkuc3VjY2VzcykgcmV0dXJuIG51bGw7XG4gIGlmIChraW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ3Byb3NwZWN0X3NhbGVzX2FwcG9pbnRtZW50cycpLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cycpLmVxKCdpZCcsIGlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gICAgLy8gU2FsZXMgbWVldGluZ3MgYXJlIEhvbWVRdW90ZSdzIG93bjogbmV2ZXIgYSBjb250cmFjdG9yJ3MuXG4gICAgaWYgKGN0eC52aWV3ZXIucm9sZSAhPT0gJ2FkbWluJyAmJiBjdHgudmlld2VyLnJvbGUgIT09ICdzZXR0ZXInKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjYWxlbmRhciA9IGRhdGEuY2FsZW5kYXJfaWQgPyBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgZGF0YS5jYWxlbmRhcl9pZCkgOiBudWxsO1xuICAgIHJldHVybiB7IGtpbmQsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IG51bGwsIGxlYWRJZDogbnVsbCwgc2NoZWR1bGVkQXQ6IGRhdGEuc2NoZWR1bGVkX2F0LCBzdGF0dXM6IGRhdGEuc3RhdHVzIH07XG4gIH1cbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiXG4gICAgLmZyb20oJ2FwcG9pbnRtZW50cycpXG4gICAgLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBsZWFkX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cywgYXNzaWdubWVudDpsZWFkX2Fzc2lnbm1lbnRzKGNvbnRyYWN0b3JfaWQsIGxlYWRfaWQpJylcbiAgICAuZXEoJ2lkJywgaWQpXG4gICAgLm1heWJlU2luZ2xlKCk7XG4gIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGFzZyA9IEFycmF5LmlzQXJyYXkoZGF0YS5hc3NpZ25tZW50KSA/IGRhdGEuYXNzaWdubWVudFswXSA6IGRhdGEuYXNzaWdubWVudDtcbiAgY29uc3QgY2FsZW5kYXIgPSBkYXRhLmNhbGVuZGFyX2lkID8gYXdhaXQgdmlzaWJsZUNhbGVuZGFyKGN0eC51c2VyRGIsIGRhdGEuY2FsZW5kYXJfaWQpIDogbnVsbDtcbiAgY29uc3QgcmVmOiBCb29raW5nUmVmID0ge1xuICAgIGtpbmQ6ICdhcHBvaW50bWVudCcsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IGRhdGEuY2FsZW5kYXJfaWQgPyBudWxsIDogYXNnPy5jb250cmFjdG9yX2lkID8/IG51bGwsXG4gICAgbGVhZElkOiBkYXRhLmxlYWRfaWQgPz8gYXNnPy5sZWFkX2lkID8/IG51bGwsIHNjaGVkdWxlZEF0OiBkYXRhLnNjaGVkdWxlZF9hdCwgc3RhdHVzOiBkYXRhLnN0YXR1cyxcbiAgfTtcbiAgaWYgKGNhbGVuZGFyKSByZXR1cm4gY2FuV29ya0NhbGVuZGFyKGN0eC52aWV3ZXIsIGNhbGVuZGFyKSA/IHJlZiA6IG51bGw7XG4gIC8vIEEgdmlzaXQgd2l0aCBubyBjYWxlbmRhcjogc3RhZmYsIG9yIHRoZSBjb250cmFjdG9yIHdob3NlIGFzc2lnbm1lbnQgaXQgaXMuXG4gIGNvbnN0IHN0YWZmID0gY3R4LnZpZXdlci5yb2xlID09PSAnYWRtaW4nIHx8IGN0eC52aWV3ZXIucm9sZSA9PT0gJ3NldHRlcic7XG4gIHJldHVybiBzdGFmZiB8fCAocmVmLnZpc2l0Q29udHJhY3RvcklkICE9PSBudWxsICYmIHJlZi52aXNpdENvbnRyYWN0b3JJZCA9PT0gY3R4LnZpZXdlci5jb250cmFjdG9yX2lkKSA/IHJlZiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGVuZGFyJyk7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2FwcG9pbnRtZW50cycpO1xuICBpZiAobGVhZElkKSB7XG4gICAgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvbGVhZHMnKTtcbiAgICByZXZhbGlkYXRlUGF0aChgL2FwcC9sZWFkcy8ke2xlYWRJZH1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlckNoYW5nZShsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGZsdXNoTm90aWZpY2F0aW9uc1Nvb24oKTtcbiAgZmx1c2hDYWxlbmRhclN5bmNTb29uKCk7XG4gIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhdWRpdE92ZXJyaWRlKGFjdG9ySWQ6IHN0cmluZywgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIC8vIFNlcnZpY2Ugcm9sZTogYXVkaXRfbG9ncyBpcyBpbnNlcnQtcmVzdHJpY3RlZCB0byBhZG1pbnMgYnkgUkxTLCBidXQgc2V0dGVycyBtYXkgb3ZlcnJpZGUgdG9vIChhcyBvbiB0aGUgbGVhZCBwYWdlKS5cbiAgYXdhaXQgY3JlYXRlQWRtaW5DbGllbnQoKS5mcm9tKCdhdWRpdF9sb2dzJykuaW5zZXJ0KHsgYWN0b3JfaWQ6IGFjdG9ySWQsIGFjdGlvbjogJ2FwcG9pbnRtZW50LmF2YWlsYWJpbGl0eV9vdmVycmlkZScsIHRhcmdldF91c2VyX2lkOiBudWxsLCBtZXRhZGF0YSB9KTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBTbG90cyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTbG90c1BheWxvYWQge1xuICBzbG90czogUHVibGljU2xvdFtdO1xuICB0aW1lWm9uZTogc3RyaW5nO1xuICBkdXJhdGlvbk1pbnV0ZXM6IG51bWJlcjtcbiAgLyoqIFRoZSBib29raW5nJ3MgY3VycmVudCBzdGFydCAocmVzY2hlZHVsaW5nKS4gKi9cbiAgY3VycmVudDogc3RyaW5nIHwgbnVsbDtcbn1cblxuLyoqIE9wZW4gdGltZXMgb24gYSBjYWxlbmRhciBmb3IgdGhlIHBpY2tlcjsgd2l0aCBgcmVzY2hlZHVsZWAsIHRoYXQgYm9va2luZydzIG93biB0aW1lIGRvZXMgbm90IGJsb2NrLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENhbGVuZGFyU2xvdHMoaW5wdXQ6IHsgY2FsZW5kYXJJZDogc3RyaW5nOyByZXNjaGVkdWxlPzogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZyB9IH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdDxTbG90c1BheWxvYWQ+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBpbnB1dC5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICBsZXQgY3VycmVudDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIGxldCBleGNsdWRlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGlucHV0LnJlc2NoZWR1bGUpIHtcbiAgICBjb25zdCByZWYgPSBhd2FpdCB3b3JrYWJsZUJvb2tpbmcoY3R4LCBpbnB1dC5yZXNjaGVkdWxlLmtpbmQsIGlucHV0LnJlc2NoZWR1bGUuaWQpO1xuICAgIGlmICghcmVmIHx8IHJlZi5jYWxlbmRhcj8uaWQgIT09IGNhbC5pZCkgcmV0dXJuIGRlbmllZDtcbiAgICBjdXJyZW50ID0gcmVmLnNjaGVkdWxlZEF0ID8gbmV3IERhdGUocmVmLnNjaGVkdWxlZEF0KS50b0lTT1N0cmluZygpIDogbnVsbDtcbiAgICBleGNsdWRlSWQgPSByZWYuaWQ7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCByID0gYXdhaXQgZ2V0U2xvdHMoY2FsLmlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBleGNsdWRlSWQgfSk7XG4gICAgaWYgKCFyKSByZXR1cm4gZGVuaWVkO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHNsb3RzOiByLnNsb3RzLm1hcCgocykgPT4gKHsgc3RhcnQ6IG5ldyBEYXRlKHMuc3RhcnRNcykudG9JU09TdHJpbmcoKSwgZW5kOiBuZXcgRGF0ZShzLmVuZE1zKS50b0lTT1N0cmluZygpIH0pKSxcbiAgICAgIHRpbWVab25lOiByLmNhbGVuZGFyLnRpbWV6b25lLFxuICAgICAgZHVyYXRpb25NaW51dGVzOiByLmNhbGVuZGFyLmR1cmF0aW9uTWludXRlcyxcbiAgICAgIGN1cnJlbnQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhaWxlZCgndW5hdmFpbGFibGUnKTtcbiAgfVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qIFdobyBjYW4gYmUgYm9va2VkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvb2thYmxlUGFydHkge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nIHwgbnVsbDtcbiAgcGhvbmU6IHN0cmluZyB8IG51bGw7XG59XG5cbmNvbnN0IHNlYXJjaElucHV0ID0gei5vYmplY3QoeyBjYWxlbmRhcklkOiB1dWlkLCBxdWVyeTogei5zdHJpbmcoKS50cmltKCkubWF4KDgwKSB9KTtcblxuLyoqXG4gKiBMZWFkcyAoaG9tZW93bmVyIGNhbGVuZGFycykgb3IgY29udHJhY3RvciBwcm9zcGVjdHMgKHNhbGVzIGNhbGVuZGFyKSB0aGVcbiAqIHVzZXIgbWF5IGJvb2ssIG1hdGNoaW5nIGEgbmFtZSAvIHBob25lIC8gZW1haWwuIFJMUyBzY29wZXMgdGhlIHNlYXJjaDpcbiAqIHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdCwgYSBzZXR0ZXJcbiAqIG9ubHkgcHJvc3BlY3RzIGFzc2lnbmVkIHRvIHRoZW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWFyY2hCb29rYWJsZShjYWxlbmRhcklkOiBzdHJpbmcsIHF1ZXJ5OiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvblJlc3VsdDx7IHJlc3VsdHM6IEJvb2thYmxlUGFydHlbXSB9Pj4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBzZWFyY2hJbnB1dC5zYWZlUGFyc2UoeyBjYWxlbmRhcklkLCBxdWVyeSB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IHRydWUsIHJlc3VsdHM6IFtdIH07XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBwYXJzZWQuZGF0YS5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICAvLyBQb3N0Z1JFU1Qgb3ItZmlsdGVyOiBzdHJpcCB0aGUgY2hhcmFjdGVycyB0aGF0IHdvdWxkIGNoYW5nZSBpdHMgbWVhbmluZy5cbiAgY29uc3QgcSA9IHBhcnNlZC5kYXRhLnF1ZXJ5LnJlcGxhY2UoL1ssKCkqJVxcXFxdL2csICcgJykudHJpbSgpO1xuICBjb25zdCBkaWdpdHMgPSBxLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgbGV0IHJlcSA9IGN0eC51c2VyRGIuZnJvbSgnY29udHJhY3Rvcl9wcm9zcGVjdHMnKS5zZWxlY3QoJ2lkLCBjb21wYW55X25hbWUsIGRlY2lzaW9uX21ha2VyX25hbWUsIHBob25lLCBjaXR5Jykub3JkZXIoJ3VwZGF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICAgIGlmIChxKSByZXEgPSByZXEub3IoW2Bjb21wYW55X25hbWUuaWxpa2UuKiR7cX0qYCwgYGRlY2lzaW9uX21ha2VyX25hbWUuaWxpa2UuKiR7cX0qYCwgLi4uKGRpZ2l0cy5sZW5ndGggPj0gMyA/IFtgcGhvbmVfZTE2NC5pbGlrZS4qJHtkaWdpdHN9KmBdIDogW10pXS5qb2luKCcsJykpO1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHJlc3VsdHM6ICgoZGF0YSA/PyBbXSkgYXMgYW55W10pLm1hcCgocCkgPT4gKHtcbiAgICAgICAgaWQ6IHAuaWQsIG5hbWU6IHAuZGVjaXNpb25fbWFrZXJfbmFtZSA/IGAke3AuZGVjaXNpb25fbWFrZXJfbmFtZX0gwrcgJHtwLmNvbXBhbnlfbmFtZX1gIDogcC5jb21wYW55X25hbWUsIGRldGFpbDogcC5jaXR5ID8/IG51bGwsIHBob25lOiBwLnBob25lID8/IG51bGwsXG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIGxldCByZXEgPSBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwaG9uZSwgZW1haWwsIGNpdHksIHZlcnRpY2FsX2lkJykub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICBpZiAoY2FsLmtpbmQgPT09ICdjb250cmFjdG9yJykge1xuICAgIC8vIE9ubHkgbGVhZHMgYXNzaWduZWQgdG8gdGhpcyBjYWxlbmRhcidzIGNvbnRyYWN0b3IgY2FuIGdvIG9uIGl0ICh0aGUgUlBDIGxpbmtzIHRoZSBhc3NpZ25tZW50KS5cbiAgICBjb25zdCB7IGRhdGE6IGFzZyB9ID0gYXdhaXQgY3R4LnVzZXJEYlxuICAgICAgLmZyb20oJ2xlYWRfYXNzaWdubWVudHMnKVxuICAgICAgLnNlbGVjdCgnbGVhZF9pZCcpXG4gICAgICAuZXEoJ2NvbnRyYWN0b3JfaWQnLCBjYWwuY29udHJhY3RvcklkKVxuICAgICAgLm9yZGVyKCdhc3NpZ25lZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLy8gVGhlIG5ld2VzdCAzMDAga2VlcCB0aGUgaWQgbGlzdCB3ZWxsIGluc2lkZSBhIFVSTDsgb2xkZXIgbGVhZHMgYXJlIHJhcmVseSBib29rZWQgZnJvbSBoZXJlLlxuICAgICAgLmxpbWl0KDMwMCk7XG4gICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQoKChhc2cgPz8gW10pIGFzIGFueVtdKS5tYXAoKGEpID0+IGEubGVhZF9pZCBhcyBzdHJpbmcpKV07XG4gICAgaWYgKCFpZHMubGVuZ3RoKSByZXR1cm4geyBvazogdHJ1ZSwgcmVzdWx0czogW10gfTtcbiAgICByZXEgPSByZXEuaW4oJ2lkJywgaWRzKTtcbiAgfVxuICBpZiAocSkge1xuICAgIGNvbnN0IHdvcmRzID0gcS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5zbGljZSgwLCAyKTtcbiAgICBjb25zdCBvcnMgPSBbXG4gICAgICAuLi53b3Jkcy5mbGF0TWFwKCh3KSA9PiBbYGZpcnN0X25hbWUuaWxpa2UuKiR7d30qYCwgYGxhc3RfbmFtZS5pbGlrZS4qJHt3fSpgXSksXG4gICAgICBgZW1haWwuaWxpa2UuKiR7cX0qYCxcbiAgICAgIC4uLihkaWdpdHMubGVuZ3RoID49IDMgPyBbYHBob25lLmlsaWtlLioke2RpZ2l0cy5zbGljZSgtNyl9KmBdIDogW10pLFxuICAgIF07XG4gICAgcmVxID0gcmVxLm9yKG9ycy5qb2luKCcsJykpO1xuICB9XG4gIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICBjb25zdCBsZWFkcyA9IChkYXRhID8/IFtdKSBhcyBhbnlbXTtcbiAgY29uc3QgdmVydGljYWxJZHMgPSBbLi4ubmV3IFNldChsZWFkcy5tYXAoKGwpID0+IGwudmVydGljYWxfaWQpLmZpbHRlcihCb29sZWFuKSldO1xuICBjb25zdCB7IGRhdGE6IHZlcnRpY2FscyB9ID0gdmVydGljYWxJZHMubGVuZ3RoID8gYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCd2ZXJ0aWNhbHMnKS5zZWxlY3QoJ2lkLCBuYW1lJykuaW4oJ2lkJywgdmVydGljYWxJZHMpIDogeyBkYXRhOiBbXSB9O1xuICBjb25zdCB2ZXJ0aWNhbCA9IG5ldyBNYXAoKCh2ZXJ0aWNhbHMgPz8gW10pIGFzIGFueVtdKS5tYXAoKHYpID0+IFt2LmlkIGFzIHN0cmluZywgdi5uYW1lIGFzIHN0cmluZ10pKTtcbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByZXN1bHRzOiBsZWFkcy5tYXAoKGwpID0+ICh7XG4gICAgICBpZDogbC5pZCxcbiAgICAgIG5hbWU6IFtsLmZpcnN0X25hbWUsIGwubGFzdF9uYW1lXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpIHx8IGwucGhvbmUgfHwgbC5lbWFpbCB8fCAnTGVhZCcsXG4gICAgICBkZXRhaWw6IFt2ZXJ0aWNhbC5nZXQobC52ZXJ0aWNhbF9pZCksIGwuY2l0eV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyDCtyAnKSB8fCBudWxsLFxuICAgICAgcGhvbmU6IGwucGhvbmUgPz8gbnVsbCxcbiAgICB9KSksXG4gIH07XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogQm9vayAvIHJlc2NoZWR1bGUgLyBjYW5jZWwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGJvb2tJbnB1dCA9IHoub2JqZWN0KHtcbiAgY2FsZW5kYXJJZDogdXVpZCxcbiAgcGFydHlJZDogdXVpZCxcbiAgc3RhcnRzQXQ6IGlzbyxcbiAgbm90ZXM6IHouc3RyaW5nKCkudHJpbSgpLm1heCgyMDAwKS5vcHRpb25hbCgpLFxuICBvdmVycmlkZTogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogQm9vayBhIGNhbGwgb24gc29tZW9uZSdzIGJlaGFsZjogYSBsZWFkIG9uIGEgaG9tZW93bmVyIGNhbGVuZGFyLCBhIHByb3NwZWN0IG9uIHRoZSBzYWxlcyBjYWxlbmRhci4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBib29rQ2FsbE9uQmVoYWxmKGlucHV0OiB6LmlucHV0PHR5cGVvZiBib29rSW5wdXQ+KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBpZDogc3RyaW5nOyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGJvb2tJbnB1dC5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgYm9va2luZycgfTtcbiAgY29uc3QgeyBjYWxlbmRhcklkLCBwYXJ0eUlkLCBzdGFydHNBdCwgbm90ZXMgfSA9IHBhcnNlZC5kYXRhO1xuICBjb25zdCBjYWwgPSBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgY2FsZW5kYXJJZCk7XG4gIGlmICghY2FsIHx8ICFjYW5Xb3JrQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsKSkgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFjYWwuYWN0aXZlKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnVGhpcyBjYWxlbmRhciBpcyBzd2l0Y2hlZCBvZmYuIFR1cm4gaXQgb24gaW4gaXRzIHNldHRpbmdzIGZpcnN0LicgfTtcbiAgY29uc3Qgb3ZlcnJpZGUgPSAhIXBhcnNlZC5kYXRhLm92ZXJyaWRlICYmIGNhbk92ZXJyaWRlU2xvdHMoY3R4LnZpZXdlcik7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgLy8gUkxTOiBhZG1pbnMgc2VlIGV2ZXJ5IHByb3NwZWN0LCBhIHNldHRlciBvbmx5IHRob3NlIGFzc2lnbmVkIHRvIHRoZW0uXG4gICAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2NvbnRyYWN0b3JfcHJvc3BlY3RzJykuc2VsZWN0KCdpZCwgY29tcGFueV9uYW1lLCBkZWNpc2lvbl9tYWtlcl9uYW1lLCBwaG9uZSwgZW1haWwnKS5lcSgnaWQnLCBwYXJ0eUlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghcCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ1Byb3NwZWN0IG5vdCBmb3VuZC4nIH07XG4gICAgY29uc3QgciA9IGF3YWl0IGJvb2tTYWxlc0FwcG9pbnRtZW50KHtcbiAgICAgIGNhbGVuZGFySWQ6IGNhbC5pZCwgc3RhcnRzQXQsIHByb3NwZWN0SWQ6IHAuaWQsXG4gICAgICAvLyBUaGUgcGVyc29uIGJvb2tpbmcgaXMgY3JlZGl0ZWQsIGFzIGluIHRoZSBjYWxsaW5nIHdvcmtzcGFjZSAoc2V0dGVyIHBheSwgMDA2MikuXG4gICAgICBwYXJ0bmVySWQ6IGN0eC5wcm9maWxlLmlkLCBzb3VyY2U6ICdtYW51YWwnLFxuICAgICAgY29udGFjdDogeyBuYW1lOiBwLmRlY2lzaW9uX21ha2VyX25hbWUgPz8gdW5kZWZpbmVkLCBwaG9uZTogcC5waG9uZSA/PyB1bmRlZmluZWQsIGVtYWlsOiBwLmVtYWlsID8/IHVuZGVmaW5lZCB9LFxuICAgICAgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgICB9KTtcbiAgICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IHNhbGVzX2FwcG9pbnRtZW50X2lkOiByLnNhbGVzQXBwb2ludG1lbnRJZCwgY2FsZW5kYXJfaWQ6IGNhbC5pZCwgc2NoZWR1bGVkX2F0OiByLnN0YXJ0c0F0IH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogJ3NhbGVzX2FwcG9pbnRtZW50JywgaWQ6IHIuc2FsZXNBcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgICBhZnRlckNoYW5nZSgpO1xuICAgIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGxzL2FwcG9pbnRtZW50cycpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5zYWxlc0FwcG9pbnRtZW50SWQsIHN0YXJ0c0F0OiByLnN0YXJ0c0F0IH07XG4gIH1cblxuICAvLyBSTFM6IHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdC5cbiAgY29uc3QgeyBkYXRhOiBsZWFkIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCcpLmVxKCdpZCcsIHBhcnR5SWQpLm1heWJlU2luZ2xlKCk7XG4gIGlmICghbGVhZCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0xlYWQgbm90IGZvdW5kLicgfTtcbiAgY29uc3QgciA9IGF3YWl0IGJvb2tBcHBvaW50bWVudCh7XG4gICAgY2FsZW5kYXJJZDogY2FsLmlkLCBzdGFydHNBdCwgbGVhZElkOiBsZWFkLmlkLCBzb3VyY2U6ICdtYW51YWwnLCBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgfSk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IGFwcG9pbnRtZW50X2lkOiByLmFwcG9pbnRtZW50SWQsIGNhbGVuZGFyX2lkOiBjYWwuaWQsIHNjaGVkdWxlZF9hdDogci5zdGFydHNBdCB9KTtcbiAgbm90aWZ5Qm9va2luZ1Nvb24oeyBraW5kOiAnYXBwb2ludG1lbnQnLCBpZDogci5hcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UobGVhZC5pZCk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5hcHBvaW50bWVudElkLCBzdGFydHNBdDogci5zdGFydHNBdCB9O1xufVxuXG5jb25zdCBjaGFuZ2VJbnB1dCA9IHoub2JqZWN0KHsga2luZDogei5lbnVtKFsnYXBwb2ludG1lbnQnLCAndmlzaXQnLCAnc2FsZXNfYXBwb2ludG1lbnQnXSksIGlkOiB1dWlkIH0pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzY2hlZHVsZUNhbGVuZGFyRXZlbnQoaW5wdXQ6IHsga2luZDogRXZlbnRLaW5kSW5wdXQ7IGlkOiBzdHJpbmc7IHN0YXJ0c0F0OiBzdHJpbmc7IG92ZXJyaWRlPzogYm9vbGVhbiB9KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXJ0c0F0OiBpc28sIG92ZXJyaWRlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpIH0pLnNhZmVQYXJzZShpbnB1dCk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgdmFsaWQgdGltZScgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFyZWYuY2FsZW5kYXIpIHJldHVybiBmYWlsZWQoJ25vdF9ib29rYWJsZScpO1xuICBjb25zdCBvdmVycmlkZSA9ICEhcGFyc2VkLmRhdGEub3ZlcnJpZGUgJiYgY2FuT3ZlcnJpZGVTbG90cyhjdHgudmlld2VyKTtcbiAgY29uc3Qgb3B0cyA9IHsgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIGFjdG9yS2luZDogJ3VzZXInIGFzIGNvbnN0LCBvdmVycmlkZSB9O1xuICBjb25zdCByID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCdcbiAgICA/IGF3YWl0IHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcGFyc2VkLmRhdGEuc3RhcnRzQXQsIG9wdHMpXG4gICAgOiBhd2FpdCByZXNjaGVkdWxlQXBwb2ludG1lbnQocmVmLmlkLCBwYXJzZWQuZGF0YS5zdGFydHNBdCwgb3B0cyk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgY29uc3Qgc3RhcnRzQXQgPSByLnN0YXJ0c0F0ID8/IG5ldyBEYXRlKHBhcnNlZC5kYXRhLnN0YXJ0c0F0KS50b0lTT1N0cmluZygpO1xuICBpZiAoIXIudW5jaGFuZ2VkKSB7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IFtgJHtyZWYua2luZH1faWRgXTogcmVmLmlkLCBjYWxlbmRhcl9pZDogcmVmLmNhbGVuZGFyLmlkLCBzY2hlZHVsZWRfYXQ6IHN0YXJ0c0F0LCByZXNjaGVkdWxlOiB0cnVlIH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogcmVmLmtpbmQsIGlkOiByZWYuaWQsIGNoYW5nZTogJ3Jlc2NoZWR1bGVkJywgcHJldmlvdXNTdGFydHNBdDogci5wcmV2aW91c1N0YXJ0c0F0ID8/IHJlZi5zY2hlZHVsZWRBdCwgYWN0b3JLaW5kOiAndXNlcicgfSk7XG4gIH1cbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBzdGFydHNBdCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FuY2VsQ2FsZW5kYXJFdmVudChpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBjaGFuZ2VJbnB1dC5leHRlbmQoeyByZWFzb246IHouc3RyaW5nKCkudHJpbSgpLm1heCg1MDApLm9wdGlvbmFsKCkgfSkuc2FmZVBhcnNlKGlucHV0KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0NoZWNrIHRoZSBjYW5jZWxsYXRpb24nIH07XG4gIGNvbnN0IHJlZiA9IGF3YWl0IHdvcmthYmxlQm9va2luZyhjdHgsIHBhcnNlZC5kYXRhLmtpbmQsIHBhcnNlZC5kYXRhLmlkKTtcbiAgaWYgKCFyZWYpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHJlYXNvbiA9IHBhcnNlZC5kYXRhLnJlYXNvbiB8fCBudWxsO1xuICBjb25zdCBvcHRzID0geyBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicgYXMgY29uc3QgfTtcbiAgY29uc3QgciA9IHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnXG4gICAgPyBhd2FpdCBjYW5jZWxTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcmVhc29uLCBvcHRzKVxuICAgIDogYXdhaXQgY2FuY2VsQXBwb2ludG1lbnQocmVmLmlkLCByZWFzb24sIG9wdHMpO1xuICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gIC8vIENhbGVuZGFyIGJvb2tpbmdzIHRlbGwgdGhlIGhvbWVvd25lciAvIHByb3NwZWN0OyBhbiBvbi1zaXRlIHZpc2l0J3Mgbm90aWNlcyBzdGF5IHdpdGggaXRzIHdvcmtmbG93cy5cbiAgaWYgKCFyLmFscmVhZHkgJiYgcmVmLmNhbGVuZGFyKSBub3RpZnlCb29raW5nU29vbih7IGtpbmQ6IHJlZi5raW5kLCBpZDogcmVmLmlkLCBjaGFuZ2U6ICdjYW5jZWxsZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlIH07XG59XG5cbmNvbnN0IFNUQVRVU19GT1I6IFJlY29yZDwnYXBwb2ludG1lbnQnIHwgJ3NhbGVzX2FwcG9pbnRtZW50Jywgc3RyaW5nW10+ID0ge1xuICBhcHBvaW50bWVudDogWydoZWxkJywgJ25vX3Nob3cnLCAnc2NoZWR1bGVkJ10sXG4gIHNhbGVzX2FwcG9pbnRtZW50OiBbJ2NvbXBsZXRlZCcsICdub19zaG93JywgJ3NjaGVkdWxlZCddLFxufTtcblxuLyoqIEhlbGQgLyBuby1zaG93IChhbmQgYmFjayB0byBzY2hlZHVsZWQgdG8gdW5kbykuIENhbmNlbGxpbmcgZ29lcyB0aHJvdWdoIGNhbmNlbENhbGVuZGFyRXZlbnQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q2FsZW5kYXJFdmVudFN0YXR1cyhpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgc3RhdHVzOiBzdHJpbmcgfSk6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXR1czogei5zdHJpbmcoKSB9KS5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnUGljayBhIHN0YXR1cycgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgY29uc3Qgc3RhdHVzID0gcGFyc2VkLmRhdGEuc3RhdHVzO1xuICBpZiAoIVNUQVRVU19GT1JbcmVmLmtpbmRdLmluY2x1ZGVzKHN0YXR1cykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgc3RhdHVzJyB9O1xuICBpZiAocmVmLnN0YXR1cyA9PT0gJ2NhbmNlbGxlZCcpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdBIGNhbmNlbGxlZCBjYWxsIGNhbm5vdCBiZSBtYXJrZWQuIEJvb2sgYSBuZXcgb25lIGluc3RlYWQuJyB9O1xuXG4gIC8vIFRoZSB1c2VyJ3Mgb3duIGNsaWVudDogdGhlIGV4aXN0aW5nIFJMUyB3cml0ZSBydWxlcyBkZWNpZGUgKGUuZy4gYSBzZXR0ZXIgZWRpdHMgb25seSBzYWxlcyBtZWV0aW5ncyB0aGV5IGJvb2tlZCkuXG4gIGNvbnN0IHRhYmxlID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCcgPyAncHJvc3BlY3Rfc2FsZXNfYXBwb2ludG1lbnRzJyA6ICdhcHBvaW50bWVudHMnO1xuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20odGFibGUpLnVwZGF0ZSh7IHN0YXR1cyB9KS5lcSgnaWQnLCByZWYuaWQpLnNlbGVjdCgnaWQnKTtcbiAgaWYgKGVycm9yIHx8ICEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiByZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JyA/ICdPbmx5IGFuIGFkbWluIG9yIHRoZSBzZXR0ZXIgd2hvIGJvb2tlZCB0aGlzIG1lZXRpbmcgY2FuIGNoYW5nZSBpdC4nIDogJ1RoaXMgYXBwb2ludG1lbnQgY291bGQgbm90IGJlIHVwZGF0ZWQuJyB9O1xuICB9XG5cbiAgaWYgKHJlZi5raW5kID09PSAnYXBwb2ludG1lbnQnICYmIHJlZi5sZWFkSWQgJiYgc3RhdHVzID09PSAnaGVsZCcpIHtcbiAgICAvLyBBIGhlbGQgY2FsbCB3aXRoIHRoZSBIb21lUXVvdGUgdGVhbSBpcyBub3QgdGhlIGNvbnRyYWN0b3IgYXBwb2ludG1lbnQ6IHRoZSBsZWFkJ3Mgc3RhZ2Ugc3RheXMgd2hlcmUgaXQgaXMuXG4gICAgY29uc3QgdGVhbUNhbGwgPSByZWYuY2FsZW5kYXI/LmtpbmQgPT09ICd0ZWFtJztcbiAgICBpZiAoIXRlYW1DYWxsKSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykudXBkYXRlKHsgc3RhdHVzOiAnYXBwb2ludG1lbnRfY29tcGxldGVkJyB9KS5lcSgnaWQnLCByZWYubGVhZElkKTtcbiAgICBjb25zdCBjb250cmFjdG9ySWQgPSByZWYuY2FsZW5kYXI/LmNvbnRyYWN0b3JJZCA/PyByZWYudmlzaXRDb250cmFjdG9ySWQ7XG4gICAgYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCdsZWFkX2FjdGl2aXRpZXMnKS5pbnNlcnQoe1xuICAgICAgbGVhZF9pZDogcmVmLmxlYWRJZCwgYWN0b3JfaWQ6IGN0eC5wcm9maWxlLmlkLCB0eXBlOiAnYXBwb2ludG1lbnQnLCBib2R5OiB0ZWFtQ2FsbCA/ICdDYWxsIHdpdGggdGhlIEhvbWVRdW90ZSB0ZWFtIGhlbGQnIDogJ0FwcG9pbnRtZW50IGNvbXBsZXRlZCcsXG4gICAgICAvLyBDb250cmFjdG9yLWF1dGhvcmVkIGVudHJpZXMgbXVzdCBuYW1lIHRoZWlyIG93biBjb21wYW55IChhY3Rpdml0aWVzX2luc2VydCBSTFMpLlxuICAgICAgbWV0YWRhdGE6IHsgYXBwb2ludG1lbnRfaWQ6IHJlZi5pZCwgLi4uKGNvbnRyYWN0b3JJZCA/IHsgY29udHJhY3Rvcl9pZDogY29udHJhY3RvcklkIH0gOiB7fSkgfSxcbiAgICB9KTtcbiAgfVxuICBhZnRlckNoYW5nZShyZWYubGVhZElkKTtcbiAgaWYgKHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSByZXZhbGlkYXRlUGF0aCgnL2FwcC9jYWxscy9hcHBvaW50bWVudHMnKTtcbiAgcmV0dXJuIHsgb2s6IHRydWUgfTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBDYWxlbmRhciBzZXR0aW5ncyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQ6IHN0cmluZyk6IFByb21pc2U8eyBjdHg6IEN0eDsgY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciB9IHwgeyBlcnJvcjogc3RyaW5nIH0+IHtcbiAgY29uc3QgY3R4ID0gYXdhaXQgY29udGV4dCgpO1xuICBpZiAoIWN0eCkgcmV0dXJuIHsgZXJyb3I6IGRlbmllZC5lcnJvciB9O1xuICBjb25zdCBjYWxlbmRhciA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBjYWxlbmRhcklkKTtcbiAgaWYgKCFjYWxlbmRhcikgcmV0dXJuIHsgZXJyb3I6ICdDYWxlbmRhciBub3QgZm91bmQnIH07XG4gIGlmICghY2FuTWFuYWdlQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsZW5kYXIpKSByZXR1cm4geyBlcnJvcjogJ09ubHkgYSBIb21lUXVvdGUgYWRtaW4gb3IgdGhlIGNvbXBhbnkgb3duZXIgY2FuIGNoYW5nZSB0aGlzIGNhbGVuZGFyLicgfTtcbiAgcmV0dXJuIHsgY3R4LCBjYWxlbmRhciB9O1xufVxuXG5jb25zdCBmaWVsZCA9IChmOiBGb3JtRGF0YSwgazogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHYgPSBmLmdldChrKTtcbiAgcmV0dXJuIHYgPT09IG51bGwgPyBudWxsIDogU3RyaW5nKHYpLnRyaW0oKTtcbn07XG5jb25zdCBpbnRGaWVsZCA9IChsbzogbnVtYmVyLCBoaTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpID0+IHouY29lcmNlLm51bWJlcih7IGludmFsaWRfdHlwZV9lcnJvcjogbWVzc2FnZSB9KS5pbnQobWVzc2FnZSkubWluKGxvLCBtZXNzYWdlKS5tYXgoaGksIG1lc3NhZ2UpO1xuXG5jb25zdCBzZXR0aW5nc1NjaGVtYSA9IHpcbiAgLm9iamVjdCh7XG4gICAgbmFtZTogei5zdHJpbmcoKS5taW4oMSwgJ0dpdmUgdGhlIGNhbGVuZGFyIGEgbmFtZScpLm1heCgxMjAsICdVc2UgMTIwIGNoYXJhY3RlcnMgb3IgZmV3ZXInKSxcbiAgICB0aW1lem9uZTogei5zdHJpbmcoKS5yZWZpbmUoaXNWYWxpZFRpbWVab25lLCAnUGljayBhIHZhbGlkIHRpbWUgem9uZScpLFxuICAgIGR1cmF0aW9uX21pbnV0ZXM6IGludEZpZWxkKDEwLCAyNDAsICdDYWxsIGxlbmd0aCBtdXN0IGJlIDEw4oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogaW50RmllbGQoNSwgMjQwLCAnU3RhcnQgdGltZXMgbXVzdCBiZSBldmVyeSA14oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBidWZmZXJfbWludXRlczogaW50RmllbGQoMCwgMjQwLCAnQnVmZmVyIG11c3QgYmUgMOKAkzI0MCBtaW51dGVzJyksXG4gICAgbWluX25vdGljZV9taW51dGVzOiBpbnRGaWVsZCgwLCA0MzIwMCwgJ01pbmltdW0gbm90aWNlIG11c3QgYmUgMOKAkzcyMCBob3VycycpLFxuICAgIGhvcml6b25fZGF5czogaW50RmllbGQoMSwgMTIwLCAnQm9vayBhaGVhZCBtdXN0IGJlIDHigJMxMjAgZGF5cycpLFxuICAgIG1heF9wZXJfZGF5OiBpbnRGaWVsZCgxLCAxMDAsICdNYXggcGVyIGRheSBtdXN0IGJlIDHigJMxMDAnKS5udWxsYWJsZSgpLFxuICAgIG1lZXRpbmdfdHlwZTogei5lbnVtKFsncGhvbmUnLCAndmlkZW8nXSksXG4gICAgdmlkZW9fbGluazogei5zdHJpbmcoKS5tYXgoNTAwKS5yZWdleCgvXmh0dHBzOlxcL1xcLy8sICdUaGUgdmlkZW8gbGluayBtdXN0IHN0YXJ0IHdpdGggaHR0cHM6Ly8nKS5udWxsYWJsZSgpLFxuICAgIGFjdGl2ZTogei5ib29sZWFuKCksXG4gIH0pXG4gIC5yZWZpbmUoKHMpID0+IHMubWVldGluZ190eXBlICE9PSAndmlkZW8nIHx8ICEhcy52aWRlb19saW5rLCB7IG1lc3NhZ2U6ICdBZGQgdGhlIHZpZGVvIGxpbmsgY2FsbGVycyB3aWxsIGpvaW4nLCBwYXRoOiBbJ3ZpZGVvX2xpbmsnXSB9KTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJTZXR0aW5ncyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgY29uc3Qgbm90aWNlID0gZmllbGQoZm9ybURhdGEsICdtaW5fbm90aWNlX2hvdXJzJyk7XG4gIGNvbnN0IHBhcnNlZCA9IHNldHRpbmdzU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgbmFtZTogZmllbGQoZm9ybURhdGEsICduYW1lJyksXG4gICAgdGltZXpvbmU6IGZpZWxkKGZvcm1EYXRhLCAndGltZXpvbmUnKSxcbiAgICBkdXJhdGlvbl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2R1cmF0aW9uX21pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogZmllbGQoZm9ybURhdGEsICdzbG90X3N0ZXBfbWludXRlcycpLFxuICAgIGJ1ZmZlcl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2J1ZmZlcl9taW51dGVzJykgfHwgMCxcbiAgICBtaW5fbm90aWNlX21pbnV0ZXM6IG5vdGljZSA/IE1hdGgucm91bmQoTnVtYmVyKG5vdGljZSkgKiA2MCkgOiAwLFxuICAgIGhvcml6b25fZGF5czogZmllbGQoZm9ybURhdGEsICdob3Jpem9uX2RheXMnKSxcbiAgICBtYXhfcGVyX2RheTogZmllbGQoZm9ybURhdGEsICdtYXhfcGVyX2RheScpIHx8IG51bGwsXG4gICAgbWVldGluZ190eXBlOiBmaWVsZChmb3JtRGF0YSwgJ21lZXRpbmdfdHlwZScpLFxuICAgIHZpZGVvX2xpbms6IGZpZWxkKGZvcm1EYXRhLCAndmlkZW9fbGluaycpIHx8IG51bGwsXG4gICAgYWN0aXZlOiBmb3JtRGF0YS5nZXQoJ2FjdGl2ZScpID09PSAnb24nLFxuICB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgZXJyb3I6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgPz8gJ0NoZWNrIHRoZSBzZXR0aW5ncycgfTtcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJzJykudXBkYXRlKHBhcnNlZC5kYXRhKS5lcSgnaWQnLCBtLmNhbGVuZGFyLmlkKS5zZWxlY3QoJ2lkJyk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgaWYgKCEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHJldHVybiB7IGVycm9yOiAnWW91IGNhbuKAmXQgY2hhbmdlIHRoaXMgY2FsZW5kYXIuJyB9O1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbiAgcmV0dXJuIHsgc3VjY2VzczogJ1NldHRpbmdzIHNhdmVkJyB9O1xufVxuXG5jb25zdCBydWxlU2NoZW1hID0gelxuICAub2JqZWN0KHsgd2Vla2RheTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDYpLCBzdGFydE1pbnV0ZTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDE0MzkpLCBlbmRNaW51dGU6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgxNDQwKSB9KVxuICAucmVmaW5lKChyKSA9PiByLmVuZE1pbnV0ZSA+IHIuc3RhcnRNaW51dGUsICdFbmQgdGltZSBtdXN0IGJlIGFmdGVyIHN0YXJ0IHRpbWUnKTtcblxuLyoqIFJlcGxhY2UgdGhlIGNhbGVuZGFyJ3Mgd2Vla2x5IGhvdXJzIChXZWVrbHlFZGl0b3IncyBgcnVsZXNgIEpTT04pLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJSdWxlcyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgbGV0IHJhdzogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICByYXcgPSBKU09OLnBhcnNlKFN0cmluZyhmb3JtRGF0YS5nZXQoJ3J1bGVzJykgPz8gJ1tdJykpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIHRoZSBob3VycycgfTtcbiAgfVxuICBjb25zdCBwYXJzZWQgPSB6LmFycmF5KHJ1bGVTY2hlbWEpLm1heCg1MCkuc2FmZVBhcnNlKHJhdyk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgaG91cnMnIH07XG4gIGNvbnN0IHJ1bGVzID0gcGFyc2VkLmRhdGE7XG4gIGZvciAobGV0IGQgPSAwOyBkIDwgNzsgZCsrKSB7XG4gICAgY29uc3QgZGF5ID0gcnVsZXMuZmlsdGVyKChyKSA9PiByLndlZWtkYXkgPT09IGQpLnNvcnQoKGEsIGIpID0+IGEuc3RhcnRNaW51dGUgLSBiLnN0YXJ0TWludXRlKTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGRheS5sZW5ndGg7IGkrKykgaWYgKGRheVtpXS5zdGFydE1pbnV0ZSA8IGRheVtpIC0gMV0uZW5kTWludXRlKSByZXR1cm4geyBlcnJvcjogJ0hvdXJzIG9uIHRoZSBzYW1lIGRheSBvdmVybGFwJyB9O1xuICB9XG4gIGNvbnN0IGRiID0gbS5jdHgudXNlckRiO1xuICBjb25zdCB7IGVycm9yOiBkZWxFcnJvciB9ID0gYXdhaXQgZGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcl9ydWxlcycpLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpO1xuICBpZiAoZGVsRXJyb3IpIHJldHVybiB7IGVycm9yOiBkZWxFcnJvci5tZXNzYWdlIH07XG4gIGlmIChydWxlcy5sZW5ndGgpIHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBkYi5mcm9tKCdib29raW5nX2NhbGVuZGFyX3J1bGVzJykuaW5zZXJ0KFxuICAgICAgcnVsZXMubWFwKChyKSA9PiAoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgd2Vla2RheTogci53ZWVrZGF5LCBzdGFydF9taW51dGU6IHIuc3RhcnRNaW51dGUsIGVuZF9taW51dGU6IHIuZW5kTWludXRlIH0pKVxuICAgICk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4geyBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG4gIHJlZnJlc2hDYWxlbmRhcigpO1xuICByZXR1cm4geyBzdWNjZXNzOiBydWxlcy5sZW5ndGggPyAnSG91cnMgc2F2ZWQnIDogJ0hvdXJzIGNsZWFyZWQ6IG5vdGhpbmcgY2FuIGJlIGJvb2tlZCB1bnRpbCB5b3UgYWRkIHNvbWUnIH07XG59XG5cbi8qKiBQZW9wbGUgd2hvIG1heSBob3N0IGEgY2FsZW5kYXI6IHRlYW0gLyBzYWxlcyB0YWtlIEhvbWVRdW90ZSBhZG1pbnMgKyBzZXR0ZXJzOyBhIGNvbnRyYWN0b3IgY2FsZW5kYXIgaXRzIG93biBjb21wYW55J3MgdXNlcnMuICovXG5hc3luYyBmdW5jdGlvbiBlbGlnaWJsZUhvc3QoY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciwgdXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjcmVhdGVBZG1pbkNsaWVudCgpLmZyb20oJ3Byb2ZpbGVzJykuc2VsZWN0KCdpZCwgcm9sZSwgY29udHJhY3Rvcl9pZCwgaXNfYWN0aXZlJykuZXEoJ2lkJywgdXNlcklkKS5tYXliZVNpbmdsZSgpO1xuICBpZiAoIXAgfHwgcC5pc19hY3RpdmUgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBjYWxlbmRhci5raW5kID09PSAnY29udHJhY3RvcicgPyBwLnJvbGUgPT09ICdjb250cmFjdG9yJyAmJiBwLmNvbnRyYWN0b3JfaWQgPT09IGNhbGVuZGFyLmNvbnRyYWN0b3JJZCA6IHAucm9sZSA9PT0gJ2FkbWluJyB8fCBwLnJvbGUgPT09ICdzZXR0ZXInO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQm9va2luZ0NhbGVuZGFyTWVtYmVyKGNhbGVuZGFySWQ6IHN0cmluZywgX3ByZXY6IFNldHRpbmdzU3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8U2V0dGluZ3NTdGF0ZT4ge1xuICBjb25zdCBtID0gYXdhaXQgbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQpO1xuICBpZiAoJ2Vycm9yJyBpbiBtKSByZXR1cm4geyBlcnJvcjogbS5lcnJvciB9O1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZSh1c2VySWQpLnN1Y2Nlc3MgfHwgIShhd2FpdCBlbGlnaWJsZUhvc3QobS5jYWxlbmRhciwgdXNlcklkKSkpIHJldHVybiB7IGVycm9yOiAnUGljayBhIHBlcnNvbiB0byBhZGQnIH07XG4gIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IG0uY3R4LnVzZXJEYlxuICAgIC5mcm9tKCdib29raW5nX2NhbGVuZGFyX21lbWJlcnMnKVxuICAgIC51cHNlcnQoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgdXNlcl9pZDogdXNlcklkLCBub3RpZnk6IHRydWUgfSwgeyBvbkNvbmZsaWN0OiAnY2FsZW5kYXJfaWQsdXNlcl9pZCcgfSk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgcmVmcmVzaENhbGVuZGFyKCk7XG4gIHJldHVybiB7IHN1Y2Nlc3M6ICdIb3N0IGFkZGVkJyB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va2luZ0NhbGVuZGFyTWVtYmVyKGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjYWxlbmRhcklkID0gZmllbGQoZm9ybURhdGEsICdjYWxlbmRhcl9pZCcpID8/ICcnO1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgY29uc3Qgb3AgPSBmaWVsZChmb3JtRGF0YSwgJ29wJyk7XG4gIGNvbnN0IG0gPSBhd2FpdCBtYW5hZ2VhYmxlQ2FsZW5kYXIoY2FsZW5kYXJJZCk7XG4gIGlmICgnZXJyb3InIGluIG0gfHwgIXV1aWQuc2FmZVBhcnNlKHVzZXJJZCkuc3VjY2VzcykgcmV0dXJuO1xuICBjb25zdCBtZW1iZXJzID0gbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJfbWVtYmVycycpO1xuICBpZiAob3AgPT09ICdyZW1vdmUnKSBhd2FpdCBtZW1iZXJzLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpLmVxKCd1c2VyX2lkJywgdXNlcklkKTtcbiAgZWxzZSBpZiAob3AgPT09ICdub3RpZnlfb24nIHx8IG9wID09PSAnbm90aWZ5X29mZicpIGF3YWl0IG1lbWJlcnMudXBkYXRlKHsgbm90aWZ5OiBvcCA9PT0gJ25vdGlmeV9vbicgfSkuZXEoJ2NhbGVuZGFyX2lkJywgbS5jYWxlbmRhci5pZCkuZXEoJ3VzZXJfaWQnLCB1c2VySWQpO1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoidVNBbVVzQiJ9
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/actions/data:1596fd [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"40251eea8dfee85a2721244cbe825fe6f98747a26e":"setCalendarEventStatus"},"lib/actions/booking.ts",""] */ __turbopack_context__.s([
    "setCalendarEventStatus",
    ()=>setCalendarEventStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var setCalendarEventStatus = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("40251eea8dfee85a2721244cbe825fe6f98747a26e", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "setCalendarEventStatus"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYm9va2luZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcic7XG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnkgLS0gcm93cyBjb21lIGZyb20gdGhlIHVudHlwZWQgU3VwYWJhc2UgY2xpZW50LCBhcyBlbHNld2hlcmUgaW4gbGliL2RhdGEgKi9cbmltcG9ydCB7IHJldmFsaWRhdGVQYXRoIH0gZnJvbSAnbmV4dC9jYWNoZSc7XG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcbmltcG9ydCB7IHJlcXVpcmVQcm9maWxlIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9zZXJ2ZXInO1xuaW1wb3J0IHsgY3JlYXRlQWRtaW5DbGllbnQgfSBmcm9tICdAL2xpYi9zdXBhYmFzZS9hZG1pbic7XG5pbXBvcnQgeyBnZXRTbG90cyB9IGZyb20gJ0AvbGliL2Jvb2tpbmcvc2xvdHMuc2VydmVyJztcbmltcG9ydCB7XG4gIGJvb2tBcHBvaW50bWVudCxcbiAgYm9va1NhbGVzQXBwb2ludG1lbnQsXG4gIGNhbmNlbEFwcG9pbnRtZW50LFxuICBjYW5jZWxTYWxlc0FwcG9pbnRtZW50LFxuICByZXNjaGVkdWxlQXBwb2ludG1lbnQsXG4gIHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50LFxufSBmcm9tICdAL2xpYi9ib29raW5nL2Jvb2suc2VydmVyJztcbmltcG9ydCB7IG5vdGlmeUJvb2tpbmdTb29uIH0gZnJvbSAnQC9saWIvYm9va2luZy9ub3RpZnkuc2VydmVyJztcbmltcG9ydCB7IEJPT0tJTkdfRVJST1JfTUVTU0FHRVMsIG1hcENhbGVuZGFyLCBQSUNLX0FOT1RIRVJfVElNRSwgdHlwZSBCb29raW5nQ2FsZW5kYXIsIHR5cGUgQm9va2luZ0Vycm9yIH0gZnJvbSAnQC9saWIvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgeyBpc1ZhbGlkVGltZVpvbmUgfSBmcm9tICdAL2xpYi9hdmFpbGFiaWxpdHkvdGltZSc7XG5pbXBvcnQgeyBmbHVzaE5vdGlmaWNhdGlvbnNTb29uIH0gZnJvbSAnQC9saWIvbm90aWZpY2F0aW9ucy9vdXRib3gnO1xuaW1wb3J0IHsgZmx1c2hDYWxlbmRhclN5bmNTb29uIH0gZnJvbSAnQC9saWIvY2FsZW5kYXIvc3luYy5zZXJ2ZXInO1xuaW1wb3J0IHsgY2FuTWFuYWdlQ2FsZW5kYXIsIGNhbk92ZXJyaWRlU2xvdHMsIGNhblVzZUNhbGVuZGFyUGFnZSwgY2FuV29ya0NhbGVuZGFyLCB0eXBlIENhbGVuZGFyVmlld2VyIH0gZnJvbSAnQC9jb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcyc7XG5pbXBvcnQgdHlwZSB7IFB1YmxpY1Nsb3QgfSBmcm9tICdAL2NvbXBvbmVudHMvYm9va2luZy90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IFByb2ZpbGUgfSBmcm9tICdAL2xpYi90eXBlcyc7XG5cbi8qKlxuICogSW4tYXBwIGNhbGVuZGFyIGFjdGlvbnMgKGFwcC9hcHAvY2FsZW5kYXIpOiBzbG90cyBmb3IgdGhlIHBpY2tlciwgYm9vayBhXG4gKiBjYWxsIG9uIHNvbWVvbmUncyBiZWhhbGYsIHJlc2NoZWR1bGUsIGNhbmNlbCwgaGVsZCAvIG5vLXNob3csIGFuZCB0aGVcbiAqIGJvb2tpbmctY2FsZW5kYXIgc2V0dGluZ3MuXG4gKlxuICogRXZlcnkgYWN0aW9uIGZpcnN0IHJlYWRzIHRoZSBjYWxlbmRhciAvIGJvb2tpbmcgLyBsZWFkIHRocm91Z2ggdGhlXG4gKiBzaWduZWQtaW4gdXNlcidzIE9XTiBjbGllbnQsIHNvIFJMUyAoMDA2OCkgZGVjaWRlcyB3aGV0aGVyIHRoZXkgbWF5IHNlZSBpdCxcbiAqIHRoZW4gYXBwbGllcyB0aGUgcm9sZSBydWxlcyBpbiBjb21wb25lbnRzL2NhbGVuZGFyL2FjY2Vzcy50cyAoYSBjb250cmFjdG9yXG4gKiB3b3JrcyBvbmx5IGl0cyBvd24gY2FsZW5kYXIpLiBPbmx5IHRoZW4gZG9lcyB0aGUgc2VydmljZS1yb2xlIGJvb2tpbmcgUlBDXG4gKiBydW4sIHdoaWNoIHJlLWNoZWNrcyB0aGUgc2xvdCB1bmRlciB0aGUgY2FsZW5kYXIgbG9jay4gU3RhdHVzIGNoYW5nZXMgYW5kXG4gKiBzZXR0aW5ncyBzdGF5IG9uIHRoZSB1c2VyJ3MgY2xpZW50IChSTFMgd3JpdGUgcG9saWNpZXMgYXBwbHkgYXMgdGhleSBhcmUpLlxuICogSG9tZW93bmVyIC8gcHJvc3BlY3Qgbm90aWNlcyBnbyBvdXQgYWZ0ZXIgdGhlIHJlc3BvbnNlIChub3RpZnlCb29raW5nU29vbik7XG4gKiBwdXNoIGFuZCBHb29nbGUgc3luYyBjb21lIGZyb20gdGhlIERCIHRyaWdnZXJzIGFuZCBhcmUgZmx1c2hlZCBoZXJlLlxuICovXG5cbmV4cG9ydCB0eXBlIEFjdGlvblJlc3VsdDxUID0gb2JqZWN0PiA9ICh7IG9rOiB0cnVlIH0gJiBUKSB8IHsgb2s6IGZhbHNlOyBlcnJvcjogc3RyaW5nOyBwaWNrQW5vdGhlcj86IGJvb2xlYW4gfTtcbmV4cG9ydCB0eXBlIFNldHRpbmdzU3RhdGUgPSB7IGVycm9yPzogc3RyaW5nOyBzdWNjZXNzPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG5cbnR5cGUgRXZlbnRLaW5kSW5wdXQgPSAnYXBwb2ludG1lbnQnIHwgJ3Zpc2l0JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG5cbi8qKiBIb3N0LWZhY2luZyB3b3JkaW5nICh0aGUgaG9tZW93bmVyIG1lc3NhZ2VzIHNheSBcInlvdVwiOyBzdGFmZiBuZWVkIHRvIGtub3cgd2hhdCBoYXBwZW5lZCkuICovXG5jb25zdCBIT1NUX01FU1NBR0VTOiBQYXJ0aWFsPFJlY29yZDxCb29raW5nRXJyb3IsIHN0cmluZz4+ID0ge1xuICBhbHJlYWR5X2Jvb2tlZDogJ1RoaXMgbGVhZCBhbHJlYWR5IGhhcyBhIGNhbGwgYm9va2VkIGZyb20gdGhlIGZ1bm5lbC4nLFxuICBub3RfYm9va2FibGU6ICdUaGlzIGFwcG9pbnRtZW50IGlzIG5vdCBvbiBhIGJvb2tpbmcgY2FsZW5kYXIuIENoYW5nZSBpdCBmcm9tIHRoZSBsZWFkLicsXG4gIG5vdF9hY3RpdmU6ICdPbmx5IGEgc2NoZWR1bGVkIGNhbGwgY2FuIGJlIGNoYW5nZWQuJyxcbiAgbGVhZF9ub3RfZm91bmQ6ICdMZWFkIG5vdCBmb3VuZC4nLFxuICBhc3NpZ25tZW50X21pc21hdGNoOiAnVGhhdCBsZWFkIGlzIG5vdCBhc3NpZ25lZCB0byB0aGlzIGNvbnRyYWN0b3IuJyxcbiAgd3JvbmdfY2FsZW5kYXI6ICdUaGlzIGxlYWQgY2Fubm90IGJlIGJvb2tlZCBvbiB0aGF0IGNhbGVuZGFyLicsXG4gIGNhbGVuZGFyX2J1c3k6ICdBIGhvc3TigJlzIEdvb2dsZSBDYWxlbmRhciBpcyBidXN5IHRoZW4uIFBpY2sgYW5vdGhlciB0aW1lLicsXG59O1xuY29uc3QgbWVzc2FnZUZvciA9IChlOiBCb29raW5nRXJyb3IpID0+IEhPU1RfTUVTU0FHRVNbZV0gPz8gQk9PS0lOR19FUlJPUl9NRVNTQUdFU1tlXTtcbmNvbnN0IGZhaWxlZCA9IChlOiBCb29raW5nRXJyb3IpOiB7IG9rOiBmYWxzZTsgZXJyb3I6IHN0cmluZzsgcGlja0Fub3RoZXI/OiBib29sZWFuIH0gPT4gKHsgb2s6IGZhbHNlLCBlcnJvcjogbWVzc2FnZUZvcihlKSwgcGlja0Fub3RoZXI6IFBJQ0tfQU5PVEhFUl9USU1FLmhhcyhlKSB8fCB1bmRlZmluZWQgfSk7XG5jb25zdCBkZW5pZWQgPSB7IG9rOiBmYWxzZSBhcyBjb25zdCwgZXJyb3I6ICdZb3UgZG9u4oCZdCBoYXZlIGFjY2VzcyB0byB0aGlzIGNhbGVuZGFyLicgfTtcblxuY29uc3QgdXVpZCA9IHouc3RyaW5nKCkudXVpZCgpO1xuY29uc3QgaXNvID0gei5zdHJpbmcoKS5yZWZpbmUoKHYpID0+IE51bWJlci5pc0Zpbml0ZShEYXRlLnBhcnNlKHYpKSwgJ1BpY2sgYSB2YWxpZCB0aW1lJyk7XG5cbmludGVyZmFjZSBDdHgge1xuICBwcm9maWxlOiBQcm9maWxlO1xuICB2aWV3ZXI6IENhbGVuZGFyVmlld2VyO1xuICB1c2VyRGI6IGFueTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29udGV4dCgpOiBQcm9taXNlPEN0eCB8IG51bGw+IHtcbiAgY29uc3QgcHJvZmlsZSA9IGF3YWl0IHJlcXVpcmVQcm9maWxlKCk7XG4gIGNvbnN0IHZpZXdlcjogQ2FsZW5kYXJWaWV3ZXIgPSB7IGlkOiBwcm9maWxlLmlkLCByb2xlOiBwcm9maWxlLnJvbGUsIGNvbnRyYWN0b3JfaWQ6IHByb2ZpbGUuY29udHJhY3Rvcl9pZCwgY29udHJhY3Rvcl9yb2xlOiBwcm9maWxlLmNvbnRyYWN0b3Jfcm9sZSB9O1xuICBpZiAoIWNhblVzZUNhbGVuZGFyUGFnZSh2aWV3ZXIpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgcHJvZmlsZSwgdmlld2VyLCB1c2VyRGI6IGF3YWl0IGNyZWF0ZUNsaWVudCgpIH07XG59XG5cbi8qKiBUaGUgY2FsZW5kYXIsIHJlYWQgdGhyb3VnaCB0aGUgdXNlcidzIGNsaWVudCAoUkxTKSwgb3IgbnVsbC4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZpc2libGVDYWxlbmRhcih1c2VyRGI6IGFueSwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ0NhbGVuZGFyIHwgbnVsbD4ge1xuICBpZiAoIXV1aWQuc2FmZVBhcnNlKGlkKS5zdWNjZXNzKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCB1c2VyRGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcnMnKS5zZWxlY3QoJyonKS5lcSgnaWQnLCBpZCkubWF5YmVTaW5nbGUoKTtcbiAgcmV0dXJuIGRhdGEgPyBtYXBDYWxlbmRhcihkYXRhKSA6IG51bGw7XG59XG5cbmludGVyZmFjZSBCb29raW5nUmVmIHtcbiAga2luZDogJ2FwcG9pbnRtZW50JyB8ICdzYWxlc19hcHBvaW50bWVudCc7XG4gIGlkOiBzdHJpbmc7XG4gIGNhbGVuZGFyOiBCb29raW5nQ2FsZW5kYXIgfCBudWxsO1xuICAvKiogQ29udHJhY3RvciB0aGF0IG93bnMgYSB2aXNpdCAobm8gY2FsZW5kYXIpIHRocm91Z2ggaXRzIGFzc2lnbm1lbnQuICovXG4gIHZpc2l0Q29udHJhY3RvcklkOiBzdHJpbmcgfCBudWxsO1xuICBsZWFkSWQ6IHN0cmluZyB8IG51bGw7XG4gIHNjaGVkdWxlZEF0OiBzdHJpbmcgfCBudWxsO1xuICBzdGF0dXM6IHN0cmluZztcbn1cblxuLyoqIEEgYm9va2luZyB0aGUgdXNlciBjYW4gc2VlIChSTFMpICsgd2hldGhlciB0aGUgcm9sZSBydWxlcyBsZXQgdGhlbSB3b3JrIGl0LiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya2FibGVCb29raW5nKGN0eDogQ3R4LCBraW5kOiBFdmVudEtpbmRJbnB1dCwgaWQ6IHN0cmluZyk6IFByb21pc2U8Qm9va2luZ1JlZiB8IG51bGw+IHtcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZShpZCkuc3VjY2VzcykgcmV0dXJuIG51bGw7XG4gIGlmIChraW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSB7XG4gICAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ3Byb3NwZWN0X3NhbGVzX2FwcG9pbnRtZW50cycpLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cycpLmVxKCdpZCcsIGlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gICAgLy8gU2FsZXMgbWVldGluZ3MgYXJlIEhvbWVRdW90ZSdzIG93bjogbmV2ZXIgYSBjb250cmFjdG9yJ3MuXG4gICAgaWYgKGN0eC52aWV3ZXIucm9sZSAhPT0gJ2FkbWluJyAmJiBjdHgudmlld2VyLnJvbGUgIT09ICdzZXR0ZXInKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjYWxlbmRhciA9IGRhdGEuY2FsZW5kYXJfaWQgPyBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgZGF0YS5jYWxlbmRhcl9pZCkgOiBudWxsO1xuICAgIHJldHVybiB7IGtpbmQsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IG51bGwsIGxlYWRJZDogbnVsbCwgc2NoZWR1bGVkQXQ6IGRhdGEuc2NoZWR1bGVkX2F0LCBzdGF0dXM6IGRhdGEuc3RhdHVzIH07XG4gIH1cbiAgY29uc3QgeyBkYXRhIH0gPSBhd2FpdCBjdHgudXNlckRiXG4gICAgLmZyb20oJ2FwcG9pbnRtZW50cycpXG4gICAgLnNlbGVjdCgnaWQsIGNhbGVuZGFyX2lkLCBsZWFkX2lkLCBzY2hlZHVsZWRfYXQsIHN0YXR1cywgYXNzaWdubWVudDpsZWFkX2Fzc2lnbm1lbnRzKGNvbnRyYWN0b3JfaWQsIGxlYWRfaWQpJylcbiAgICAuZXEoJ2lkJywgaWQpXG4gICAgLm1heWJlU2luZ2xlKCk7XG4gIGlmICghZGF0YSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGFzZyA9IEFycmF5LmlzQXJyYXkoZGF0YS5hc3NpZ25tZW50KSA/IGRhdGEuYXNzaWdubWVudFswXSA6IGRhdGEuYXNzaWdubWVudDtcbiAgY29uc3QgY2FsZW5kYXIgPSBkYXRhLmNhbGVuZGFyX2lkID8gYXdhaXQgdmlzaWJsZUNhbGVuZGFyKGN0eC51c2VyRGIsIGRhdGEuY2FsZW5kYXJfaWQpIDogbnVsbDtcbiAgY29uc3QgcmVmOiBCb29raW5nUmVmID0ge1xuICAgIGtpbmQ6ICdhcHBvaW50bWVudCcsIGlkLCBjYWxlbmRhciwgdmlzaXRDb250cmFjdG9ySWQ6IGRhdGEuY2FsZW5kYXJfaWQgPyBudWxsIDogYXNnPy5jb250cmFjdG9yX2lkID8/IG51bGwsXG4gICAgbGVhZElkOiBkYXRhLmxlYWRfaWQgPz8gYXNnPy5sZWFkX2lkID8/IG51bGwsIHNjaGVkdWxlZEF0OiBkYXRhLnNjaGVkdWxlZF9hdCwgc3RhdHVzOiBkYXRhLnN0YXR1cyxcbiAgfTtcbiAgaWYgKGNhbGVuZGFyKSByZXR1cm4gY2FuV29ya0NhbGVuZGFyKGN0eC52aWV3ZXIsIGNhbGVuZGFyKSA/IHJlZiA6IG51bGw7XG4gIC8vIEEgdmlzaXQgd2l0aCBubyBjYWxlbmRhcjogc3RhZmYsIG9yIHRoZSBjb250cmFjdG9yIHdob3NlIGFzc2lnbm1lbnQgaXQgaXMuXG4gIGNvbnN0IHN0YWZmID0gY3R4LnZpZXdlci5yb2xlID09PSAnYWRtaW4nIHx8IGN0eC52aWV3ZXIucm9sZSA9PT0gJ3NldHRlcic7XG4gIHJldHVybiBzdGFmZiB8fCAocmVmLnZpc2l0Q29udHJhY3RvcklkICE9PSBudWxsICYmIHJlZi52aXNpdENvbnRyYWN0b3JJZCA9PT0gY3R4LnZpZXdlci5jb250cmFjdG9yX2lkKSA/IHJlZiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGVuZGFyJyk7XG4gIHJldmFsaWRhdGVQYXRoKCcvYXBwL2FwcG9pbnRtZW50cycpO1xuICBpZiAobGVhZElkKSB7XG4gICAgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvbGVhZHMnKTtcbiAgICByZXZhbGlkYXRlUGF0aChgL2FwcC9sZWFkcy8ke2xlYWRJZH1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlckNoYW5nZShsZWFkSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGZsdXNoTm90aWZpY2F0aW9uc1Nvb24oKTtcbiAgZmx1c2hDYWxlbmRhclN5bmNTb29uKCk7XG4gIHJlZnJlc2hDYWxlbmRhcihsZWFkSWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhdWRpdE92ZXJyaWRlKGFjdG9ySWQ6IHN0cmluZywgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIC8vIFNlcnZpY2Ugcm9sZTogYXVkaXRfbG9ncyBpcyBpbnNlcnQtcmVzdHJpY3RlZCB0byBhZG1pbnMgYnkgUkxTLCBidXQgc2V0dGVycyBtYXkgb3ZlcnJpZGUgdG9vIChhcyBvbiB0aGUgbGVhZCBwYWdlKS5cbiAgYXdhaXQgY3JlYXRlQWRtaW5DbGllbnQoKS5mcm9tKCdhdWRpdF9sb2dzJykuaW5zZXJ0KHsgYWN0b3JfaWQ6IGFjdG9ySWQsIGFjdGlvbjogJ2FwcG9pbnRtZW50LmF2YWlsYWJpbGl0eV9vdmVycmlkZScsIHRhcmdldF91c2VyX2lkOiBudWxsLCBtZXRhZGF0YSB9KTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBTbG90cyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTbG90c1BheWxvYWQge1xuICBzbG90czogUHVibGljU2xvdFtdO1xuICB0aW1lWm9uZTogc3RyaW5nO1xuICBkdXJhdGlvbk1pbnV0ZXM6IG51bWJlcjtcbiAgLyoqIFRoZSBib29raW5nJ3MgY3VycmVudCBzdGFydCAocmVzY2hlZHVsaW5nKS4gKi9cbiAgY3VycmVudDogc3RyaW5nIHwgbnVsbDtcbn1cblxuLyoqIE9wZW4gdGltZXMgb24gYSBjYWxlbmRhciBmb3IgdGhlIHBpY2tlcjsgd2l0aCBgcmVzY2hlZHVsZWAsIHRoYXQgYm9va2luZydzIG93biB0aW1lIGRvZXMgbm90IGJsb2NrLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldENhbGVuZGFyU2xvdHMoaW5wdXQ6IHsgY2FsZW5kYXJJZDogc3RyaW5nOyByZXNjaGVkdWxlPzogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZyB9IH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdDxTbG90c1BheWxvYWQ+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBpbnB1dC5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICBsZXQgY3VycmVudDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIGxldCBleGNsdWRlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKGlucHV0LnJlc2NoZWR1bGUpIHtcbiAgICBjb25zdCByZWYgPSBhd2FpdCB3b3JrYWJsZUJvb2tpbmcoY3R4LCBpbnB1dC5yZXNjaGVkdWxlLmtpbmQsIGlucHV0LnJlc2NoZWR1bGUuaWQpO1xuICAgIGlmICghcmVmIHx8IHJlZi5jYWxlbmRhcj8uaWQgIT09IGNhbC5pZCkgcmV0dXJuIGRlbmllZDtcbiAgICBjdXJyZW50ID0gcmVmLnNjaGVkdWxlZEF0ID8gbmV3IERhdGUocmVmLnNjaGVkdWxlZEF0KS50b0lTT1N0cmluZygpIDogbnVsbDtcbiAgICBleGNsdWRlSWQgPSByZWYuaWQ7XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCByID0gYXdhaXQgZ2V0U2xvdHMoY2FsLmlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBleGNsdWRlSWQgfSk7XG4gICAgaWYgKCFyKSByZXR1cm4gZGVuaWVkO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHNsb3RzOiByLnNsb3RzLm1hcCgocykgPT4gKHsgc3RhcnQ6IG5ldyBEYXRlKHMuc3RhcnRNcykudG9JU09TdHJpbmcoKSwgZW5kOiBuZXcgRGF0ZShzLmVuZE1zKS50b0lTT1N0cmluZygpIH0pKSxcbiAgICAgIHRpbWVab25lOiByLmNhbGVuZGFyLnRpbWV6b25lLFxuICAgICAgZHVyYXRpb25NaW51dGVzOiByLmNhbGVuZGFyLmR1cmF0aW9uTWludXRlcyxcbiAgICAgIGN1cnJlbnQsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhaWxlZCgndW5hdmFpbGFibGUnKTtcbiAgfVxufVxuXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbi8qIFdobyBjYW4gYmUgYm9va2VkICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvb2thYmxlUGFydHkge1xuICBpZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRldGFpbDogc3RyaW5nIHwgbnVsbDtcbiAgcGhvbmU6IHN0cmluZyB8IG51bGw7XG59XG5cbmNvbnN0IHNlYXJjaElucHV0ID0gei5vYmplY3QoeyBjYWxlbmRhcklkOiB1dWlkLCBxdWVyeTogei5zdHJpbmcoKS50cmltKCkubWF4KDgwKSB9KTtcblxuLyoqXG4gKiBMZWFkcyAoaG9tZW93bmVyIGNhbGVuZGFycykgb3IgY29udHJhY3RvciBwcm9zcGVjdHMgKHNhbGVzIGNhbGVuZGFyKSB0aGVcbiAqIHVzZXIgbWF5IGJvb2ssIG1hdGNoaW5nIGEgbmFtZSAvIHBob25lIC8gZW1haWwuIFJMUyBzY29wZXMgdGhlIHNlYXJjaDpcbiAqIHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdCwgYSBzZXR0ZXJcbiAqIG9ubHkgcHJvc3BlY3RzIGFzc2lnbmVkIHRvIHRoZW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWFyY2hCb29rYWJsZShjYWxlbmRhcklkOiBzdHJpbmcsIHF1ZXJ5OiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvblJlc3VsdDx7IHJlc3VsdHM6IEJvb2thYmxlUGFydHlbXSB9Pj4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBzZWFyY2hJbnB1dC5zYWZlUGFyc2UoeyBjYWxlbmRhcklkLCBxdWVyeSB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IHRydWUsIHJlc3VsdHM6IFtdIH07XG4gIGNvbnN0IGNhbCA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBwYXJzZWQuZGF0YS5jYWxlbmRhcklkKTtcbiAgaWYgKCFjYWwgfHwgIWNhbldvcmtDYWxlbmRhcihjdHgudmlld2VyLCBjYWwpKSByZXR1cm4gZGVuaWVkO1xuICAvLyBQb3N0Z1JFU1Qgb3ItZmlsdGVyOiBzdHJpcCB0aGUgY2hhcmFjdGVycyB0aGF0IHdvdWxkIGNoYW5nZSBpdHMgbWVhbmluZy5cbiAgY29uc3QgcSA9IHBhcnNlZC5kYXRhLnF1ZXJ5LnJlcGxhY2UoL1ssKCkqJVxcXFxdL2csICcgJykudHJpbSgpO1xuICBjb25zdCBkaWdpdHMgPSBxLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgbGV0IHJlcSA9IGN0eC51c2VyRGIuZnJvbSgnY29udHJhY3Rvcl9wcm9zcGVjdHMnKS5zZWxlY3QoJ2lkLCBjb21wYW55X25hbWUsIGRlY2lzaW9uX21ha2VyX25hbWUsIHBob25lLCBjaXR5Jykub3JkZXIoJ3VwZGF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICAgIGlmIChxKSByZXEgPSByZXEub3IoW2Bjb21wYW55X25hbWUuaWxpa2UuKiR7cX0qYCwgYGRlY2lzaW9uX21ha2VyX25hbWUuaWxpa2UuKiR7cX0qYCwgLi4uKGRpZ2l0cy5sZW5ndGggPj0gMyA/IFtgcGhvbmVfZTE2NC5pbGlrZS4qJHtkaWdpdHN9KmBdIDogW10pXS5qb2luKCcsJykpO1xuICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHJlc3VsdHM6ICgoZGF0YSA/PyBbXSkgYXMgYW55W10pLm1hcCgocCkgPT4gKHtcbiAgICAgICAgaWQ6IHAuaWQsIG5hbWU6IHAuZGVjaXNpb25fbWFrZXJfbmFtZSA/IGAke3AuZGVjaXNpb25fbWFrZXJfbmFtZX0gwrcgJHtwLmNvbXBhbnlfbmFtZX1gIDogcC5jb21wYW55X25hbWUsIGRldGFpbDogcC5jaXR5ID8/IG51bGwsIHBob25lOiBwLnBob25lID8/IG51bGwsXG4gICAgICB9KSksXG4gICAgfTtcbiAgfVxuXG4gIGxldCByZXEgPSBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCwgZmlyc3RfbmFtZSwgbGFzdF9uYW1lLCBwaG9uZSwgZW1haWwsIGNpdHksIHZlcnRpY2FsX2lkJykub3JkZXIoJ2NyZWF0ZWRfYXQnLCB7IGFzY2VuZGluZzogZmFsc2UgfSkubGltaXQoMTIpO1xuICBpZiAoY2FsLmtpbmQgPT09ICdjb250cmFjdG9yJykge1xuICAgIC8vIE9ubHkgbGVhZHMgYXNzaWduZWQgdG8gdGhpcyBjYWxlbmRhcidzIGNvbnRyYWN0b3IgY2FuIGdvIG9uIGl0ICh0aGUgUlBDIGxpbmtzIHRoZSBhc3NpZ25tZW50KS5cbiAgICBjb25zdCB7IGRhdGE6IGFzZyB9ID0gYXdhaXQgY3R4LnVzZXJEYlxuICAgICAgLmZyb20oJ2xlYWRfYXNzaWdubWVudHMnKVxuICAgICAgLnNlbGVjdCgnbGVhZF9pZCcpXG4gICAgICAuZXEoJ2NvbnRyYWN0b3JfaWQnLCBjYWwuY29udHJhY3RvcklkKVxuICAgICAgLm9yZGVyKCdhc3NpZ25lZF9hdCcsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgICAgLy8gVGhlIG5ld2VzdCAzMDAga2VlcCB0aGUgaWQgbGlzdCB3ZWxsIGluc2lkZSBhIFVSTDsgb2xkZXIgbGVhZHMgYXJlIHJhcmVseSBib29rZWQgZnJvbSBoZXJlLlxuICAgICAgLmxpbWl0KDMwMCk7XG4gICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQoKChhc2cgPz8gW10pIGFzIGFueVtdKS5tYXAoKGEpID0+IGEubGVhZF9pZCBhcyBzdHJpbmcpKV07XG4gICAgaWYgKCFpZHMubGVuZ3RoKSByZXR1cm4geyBvazogdHJ1ZSwgcmVzdWx0czogW10gfTtcbiAgICByZXEgPSByZXEuaW4oJ2lkJywgaWRzKTtcbiAgfVxuICBpZiAocSkge1xuICAgIGNvbnN0IHdvcmRzID0gcS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5zbGljZSgwLCAyKTtcbiAgICBjb25zdCBvcnMgPSBbXG4gICAgICAuLi53b3Jkcy5mbGF0TWFwKCh3KSA9PiBbYGZpcnN0X25hbWUuaWxpa2UuKiR7d30qYCwgYGxhc3RfbmFtZS5pbGlrZS4qJHt3fSpgXSksXG4gICAgICBgZW1haWwuaWxpa2UuKiR7cX0qYCxcbiAgICAgIC4uLihkaWdpdHMubGVuZ3RoID49IDMgPyBbYHBob25lLmlsaWtlLioke2RpZ2l0cy5zbGljZSgtNyl9KmBdIDogW10pLFxuICAgIF07XG4gICAgcmVxID0gcmVxLm9yKG9ycy5qb2luKCcsJykpO1xuICB9XG4gIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgcmVxO1xuICBjb25zdCBsZWFkcyA9IChkYXRhID8/IFtdKSBhcyBhbnlbXTtcbiAgY29uc3QgdmVydGljYWxJZHMgPSBbLi4ubmV3IFNldChsZWFkcy5tYXAoKGwpID0+IGwudmVydGljYWxfaWQpLmZpbHRlcihCb29sZWFuKSldO1xuICBjb25zdCB7IGRhdGE6IHZlcnRpY2FscyB9ID0gdmVydGljYWxJZHMubGVuZ3RoID8gYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCd2ZXJ0aWNhbHMnKS5zZWxlY3QoJ2lkLCBuYW1lJykuaW4oJ2lkJywgdmVydGljYWxJZHMpIDogeyBkYXRhOiBbXSB9O1xuICBjb25zdCB2ZXJ0aWNhbCA9IG5ldyBNYXAoKCh2ZXJ0aWNhbHMgPz8gW10pIGFzIGFueVtdKS5tYXAoKHYpID0+IFt2LmlkIGFzIHN0cmluZywgdi5uYW1lIGFzIHN0cmluZ10pKTtcbiAgcmV0dXJuIHtcbiAgICBvazogdHJ1ZSxcbiAgICByZXN1bHRzOiBsZWFkcy5tYXAoKGwpID0+ICh7XG4gICAgICBpZDogbC5pZCxcbiAgICAgIG5hbWU6IFtsLmZpcnN0X25hbWUsIGwubGFzdF9uYW1lXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpIHx8IGwucGhvbmUgfHwgbC5lbWFpbCB8fCAnTGVhZCcsXG4gICAgICBkZXRhaWw6IFt2ZXJ0aWNhbC5nZXQobC52ZXJ0aWNhbF9pZCksIGwuY2l0eV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyDCtyAnKSB8fCBudWxsLFxuICAgICAgcGhvbmU6IGwucGhvbmUgPz8gbnVsbCxcbiAgICB9KSksXG4gIH07XG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuLyogQm9vayAvIHJlc2NoZWR1bGUgLyBjYW5jZWwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGJvb2tJbnB1dCA9IHoub2JqZWN0KHtcbiAgY2FsZW5kYXJJZDogdXVpZCxcbiAgcGFydHlJZDogdXVpZCxcbiAgc3RhcnRzQXQ6IGlzbyxcbiAgbm90ZXM6IHouc3RyaW5nKCkudHJpbSgpLm1heCgyMDAwKS5vcHRpb25hbCgpLFxuICBvdmVycmlkZTogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbn0pO1xuXG4vKiogQm9vayBhIGNhbGwgb24gc29tZW9uZSdzIGJlaGFsZjogYSBsZWFkIG9uIGEgaG9tZW93bmVyIGNhbGVuZGFyLCBhIHByb3NwZWN0IG9uIHRoZSBzYWxlcyBjYWxlbmRhci4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBib29rQ2FsbE9uQmVoYWxmKGlucHV0OiB6LmlucHV0PHR5cGVvZiBib29rSW5wdXQ+KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBpZDogc3RyaW5nOyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGJvb2tJbnB1dC5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgYm9va2luZycgfTtcbiAgY29uc3QgeyBjYWxlbmRhcklkLCBwYXJ0eUlkLCBzdGFydHNBdCwgbm90ZXMgfSA9IHBhcnNlZC5kYXRhO1xuICBjb25zdCBjYWwgPSBhd2FpdCB2aXNpYmxlQ2FsZW5kYXIoY3R4LnVzZXJEYiwgY2FsZW5kYXJJZCk7XG4gIGlmICghY2FsIHx8ICFjYW5Xb3JrQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsKSkgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFjYWwuYWN0aXZlKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnVGhpcyBjYWxlbmRhciBpcyBzd2l0Y2hlZCBvZmYuIFR1cm4gaXQgb24gaW4gaXRzIHNldHRpbmdzIGZpcnN0LicgfTtcbiAgY29uc3Qgb3ZlcnJpZGUgPSAhIXBhcnNlZC5kYXRhLm92ZXJyaWRlICYmIGNhbk92ZXJyaWRlU2xvdHMoY3R4LnZpZXdlcik7XG5cbiAgaWYgKGNhbC5raW5kID09PSAnc2FsZXMnKSB7XG4gICAgLy8gUkxTOiBhZG1pbnMgc2VlIGV2ZXJ5IHByb3NwZWN0LCBhIHNldHRlciBvbmx5IHRob3NlIGFzc2lnbmVkIHRvIHRoZW0uXG4gICAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2NvbnRyYWN0b3JfcHJvc3BlY3RzJykuc2VsZWN0KCdpZCwgY29tcGFueV9uYW1lLCBkZWNpc2lvbl9tYWtlcl9uYW1lLCBwaG9uZSwgZW1haWwnKS5lcSgnaWQnLCBwYXJ0eUlkKS5tYXliZVNpbmdsZSgpO1xuICAgIGlmICghcCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ1Byb3NwZWN0IG5vdCBmb3VuZC4nIH07XG4gICAgY29uc3QgciA9IGF3YWl0IGJvb2tTYWxlc0FwcG9pbnRtZW50KHtcbiAgICAgIGNhbGVuZGFySWQ6IGNhbC5pZCwgc3RhcnRzQXQsIHByb3NwZWN0SWQ6IHAuaWQsXG4gICAgICAvLyBUaGUgcGVyc29uIGJvb2tpbmcgaXMgY3JlZGl0ZWQsIGFzIGluIHRoZSBjYWxsaW5nIHdvcmtzcGFjZSAoc2V0dGVyIHBheSwgMDA2MikuXG4gICAgICBwYXJ0bmVySWQ6IGN0eC5wcm9maWxlLmlkLCBzb3VyY2U6ICdtYW51YWwnLFxuICAgICAgY29udGFjdDogeyBuYW1lOiBwLmRlY2lzaW9uX21ha2VyX25hbWUgPz8gdW5kZWZpbmVkLCBwaG9uZTogcC5waG9uZSA/PyB1bmRlZmluZWQsIGVtYWlsOiBwLmVtYWlsID8/IHVuZGVmaW5lZCB9LFxuICAgICAgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgICB9KTtcbiAgICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IHNhbGVzX2FwcG9pbnRtZW50X2lkOiByLnNhbGVzQXBwb2ludG1lbnRJZCwgY2FsZW5kYXJfaWQ6IGNhbC5pZCwgc2NoZWR1bGVkX2F0OiByLnN0YXJ0c0F0IH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogJ3NhbGVzX2FwcG9pbnRtZW50JywgaWQ6IHIuc2FsZXNBcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgICBhZnRlckNoYW5nZSgpO1xuICAgIHJldmFsaWRhdGVQYXRoKCcvYXBwL2NhbGxzL2FwcG9pbnRtZW50cycpO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5zYWxlc0FwcG9pbnRtZW50SWQsIHN0YXJ0c0F0OiByLnN0YXJ0c0F0IH07XG4gIH1cblxuICAvLyBSTFM6IHN0YWZmIHNlZSBldmVyeSBsZWFkLCBhIGNvbnRyYWN0b3Igb25seSBsZWFkcyBhc3NpZ25lZCB0byBpdC5cbiAgY29uc3QgeyBkYXRhOiBsZWFkIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykuc2VsZWN0KCdpZCcpLmVxKCdpZCcsIHBhcnR5SWQpLm1heWJlU2luZ2xlKCk7XG4gIGlmICghbGVhZCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0xlYWQgbm90IGZvdW5kLicgfTtcbiAgY29uc3QgciA9IGF3YWl0IGJvb2tBcHBvaW50bWVudCh7XG4gICAgY2FsZW5kYXJJZDogY2FsLmlkLCBzdGFydHNBdCwgbGVhZElkOiBsZWFkLmlkLCBzb3VyY2U6ICdtYW51YWwnLCBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicsIG5vdGVzOiBub3RlcyB8fCBudWxsLCBvdmVycmlkZSxcbiAgfSk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IGFwcG9pbnRtZW50X2lkOiByLmFwcG9pbnRtZW50SWQsIGNhbGVuZGFyX2lkOiBjYWwuaWQsIHNjaGVkdWxlZF9hdDogci5zdGFydHNBdCB9KTtcbiAgbm90aWZ5Qm9va2luZ1Nvb24oeyBraW5kOiAnYXBwb2ludG1lbnQnLCBpZDogci5hcHBvaW50bWVudElkLCBjaGFuZ2U6ICdib29rZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UobGVhZC5pZCk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBpZDogci5hcHBvaW50bWVudElkLCBzdGFydHNBdDogci5zdGFydHNBdCB9O1xufVxuXG5jb25zdCBjaGFuZ2VJbnB1dCA9IHoub2JqZWN0KHsga2luZDogei5lbnVtKFsnYXBwb2ludG1lbnQnLCAndmlzaXQnLCAnc2FsZXNfYXBwb2ludG1lbnQnXSksIGlkOiB1dWlkIH0pO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzY2hlZHVsZUNhbGVuZGFyRXZlbnQoaW5wdXQ6IHsga2luZDogRXZlbnRLaW5kSW5wdXQ7IGlkOiBzdHJpbmc7IHN0YXJ0c0F0OiBzdHJpbmc7IG92ZXJyaWRlPzogYm9vbGVhbiB9KTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ8eyBzdGFydHNBdDogc3RyaW5nIH0+PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXJ0c0F0OiBpc28sIG92ZXJyaWRlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpIH0pLnNhZmVQYXJzZShpbnB1dCk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgdmFsaWQgdGltZScgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgaWYgKCFyZWYuY2FsZW5kYXIpIHJldHVybiBmYWlsZWQoJ25vdF9ib29rYWJsZScpO1xuICBjb25zdCBvdmVycmlkZSA9ICEhcGFyc2VkLmRhdGEub3ZlcnJpZGUgJiYgY2FuT3ZlcnJpZGVTbG90cyhjdHgudmlld2VyKTtcbiAgY29uc3Qgb3B0cyA9IHsgYWN0b3JJZDogY3R4LnByb2ZpbGUuaWQsIGFjdG9yS2luZDogJ3VzZXInIGFzIGNvbnN0LCBvdmVycmlkZSB9O1xuICBjb25zdCByID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCdcbiAgICA/IGF3YWl0IHJlc2NoZWR1bGVTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcGFyc2VkLmRhdGEuc3RhcnRzQXQsIG9wdHMpXG4gICAgOiBhd2FpdCByZXNjaGVkdWxlQXBwb2ludG1lbnQocmVmLmlkLCBwYXJzZWQuZGF0YS5zdGFydHNBdCwgb3B0cyk7XG4gIGlmICghci5vaykgcmV0dXJuIGZhaWxlZChyLmVycm9yKTtcbiAgY29uc3Qgc3RhcnRzQXQgPSByLnN0YXJ0c0F0ID8/IG5ldyBEYXRlKHBhcnNlZC5kYXRhLnN0YXJ0c0F0KS50b0lTT1N0cmluZygpO1xuICBpZiAoIXIudW5jaGFuZ2VkKSB7XG4gICAgaWYgKG92ZXJyaWRlKSBhd2FpdCBhdWRpdE92ZXJyaWRlKGN0eC5wcm9maWxlLmlkLCB7IFtgJHtyZWYua2luZH1faWRgXTogcmVmLmlkLCBjYWxlbmRhcl9pZDogcmVmLmNhbGVuZGFyLmlkLCBzY2hlZHVsZWRfYXQ6IHN0YXJ0c0F0LCByZXNjaGVkdWxlOiB0cnVlIH0pO1xuICAgIG5vdGlmeUJvb2tpbmdTb29uKHsga2luZDogcmVmLmtpbmQsIGlkOiByZWYuaWQsIGNoYW5nZTogJ3Jlc2NoZWR1bGVkJywgcHJldmlvdXNTdGFydHNBdDogci5wcmV2aW91c1N0YXJ0c0F0ID8/IHJlZi5zY2hlZHVsZWRBdCwgYWN0b3JLaW5kOiAndXNlcicgfSk7XG4gIH1cbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlLCBzdGFydHNBdCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FuY2VsQ2FsZW5kYXJFdmVudChpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIH0pOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xuICBjb25zdCBjdHggPSBhd2FpdCBjb250ZXh0KCk7XG4gIGlmICghY3R4KSByZXR1cm4gZGVuaWVkO1xuICBjb25zdCBwYXJzZWQgPSBjaGFuZ2VJbnB1dC5leHRlbmQoeyByZWFzb246IHouc3RyaW5nKCkudHJpbSgpLm1heCg1MDApLm9wdGlvbmFsKCkgfSkuc2FmZVBhcnNlKGlucHV0KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0NoZWNrIHRoZSBjYW5jZWxsYXRpb24nIH07XG4gIGNvbnN0IHJlZiA9IGF3YWl0IHdvcmthYmxlQm9va2luZyhjdHgsIHBhcnNlZC5kYXRhLmtpbmQsIHBhcnNlZC5kYXRhLmlkKTtcbiAgaWYgKCFyZWYpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHJlYXNvbiA9IHBhcnNlZC5kYXRhLnJlYXNvbiB8fCBudWxsO1xuICBjb25zdCBvcHRzID0geyBhY3RvcklkOiBjdHgucHJvZmlsZS5pZCwgYWN0b3JLaW5kOiAndXNlcicgYXMgY29uc3QgfTtcbiAgY29uc3QgciA9IHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnXG4gICAgPyBhd2FpdCBjYW5jZWxTYWxlc0FwcG9pbnRtZW50KHJlZi5pZCwgcmVhc29uLCBvcHRzKVxuICAgIDogYXdhaXQgY2FuY2VsQXBwb2ludG1lbnQocmVmLmlkLCByZWFzb24sIG9wdHMpO1xuICBpZiAoIXIub2spIHJldHVybiBmYWlsZWQoci5lcnJvcik7XG4gIC8vIENhbGVuZGFyIGJvb2tpbmdzIHRlbGwgdGhlIGhvbWVvd25lciAvIHByb3NwZWN0OyBhbiBvbi1zaXRlIHZpc2l0J3Mgbm90aWNlcyBzdGF5IHdpdGggaXRzIHdvcmtmbG93cy5cbiAgaWYgKCFyLmFscmVhZHkgJiYgcmVmLmNhbGVuZGFyKSBub3RpZnlCb29raW5nU29vbih7IGtpbmQ6IHJlZi5raW5kLCBpZDogcmVmLmlkLCBjaGFuZ2U6ICdjYW5jZWxsZWQnLCBhY3RvcktpbmQ6ICd1c2VyJyB9KTtcbiAgYWZ0ZXJDaGFuZ2UocmVmLmxlYWRJZCk7XG4gIGlmIChyZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JykgcmV2YWxpZGF0ZVBhdGgoJy9hcHAvY2FsbHMvYXBwb2ludG1lbnRzJyk7XG4gIHJldHVybiB7IG9rOiB0cnVlIH07XG59XG5cbmNvbnN0IFNUQVRVU19GT1I6IFJlY29yZDwnYXBwb2ludG1lbnQnIHwgJ3NhbGVzX2FwcG9pbnRtZW50Jywgc3RyaW5nW10+ID0ge1xuICBhcHBvaW50bWVudDogWydoZWxkJywgJ25vX3Nob3cnLCAnc2NoZWR1bGVkJ10sXG4gIHNhbGVzX2FwcG9pbnRtZW50OiBbJ2NvbXBsZXRlZCcsICdub19zaG93JywgJ3NjaGVkdWxlZCddLFxufTtcblxuLyoqIEhlbGQgLyBuby1zaG93IChhbmQgYmFjayB0byBzY2hlZHVsZWQgdG8gdW5kbykuIENhbmNlbGxpbmcgZ29lcyB0aHJvdWdoIGNhbmNlbENhbGVuZGFyRXZlbnQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0Q2FsZW5kYXJFdmVudFN0YXR1cyhpbnB1dDogeyBraW5kOiBFdmVudEtpbmRJbnB1dDsgaWQ6IHN0cmluZzsgc3RhdHVzOiBzdHJpbmcgfSk6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gIGNvbnN0IGN0eCA9IGF3YWl0IGNvbnRleHQoKTtcbiAgaWYgKCFjdHgpIHJldHVybiBkZW5pZWQ7XG4gIGNvbnN0IHBhcnNlZCA9IGNoYW5nZUlucHV0LmV4dGVuZCh7IHN0YXR1czogei5zdHJpbmcoKSB9KS5zYWZlUGFyc2UoaW5wdXQpO1xuICBpZiAoIXBhcnNlZC5zdWNjZXNzKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnUGljayBhIHN0YXR1cycgfTtcbiAgY29uc3QgcmVmID0gYXdhaXQgd29ya2FibGVCb29raW5nKGN0eCwgcGFyc2VkLmRhdGEua2luZCwgcGFyc2VkLmRhdGEuaWQpO1xuICBpZiAoIXJlZikgcmV0dXJuIGRlbmllZDtcbiAgY29uc3Qgc3RhdHVzID0gcGFyc2VkLmRhdGEuc3RhdHVzO1xuICBpZiAoIVNUQVRVU19GT1JbcmVmLmtpbmRdLmluY2x1ZGVzKHN0YXR1cykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdQaWNrIGEgc3RhdHVzJyB9O1xuICBpZiAocmVmLnN0YXR1cyA9PT0gJ2NhbmNlbGxlZCcpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdBIGNhbmNlbGxlZCBjYWxsIGNhbm5vdCBiZSBtYXJrZWQuIEJvb2sgYSBuZXcgb25lIGluc3RlYWQuJyB9O1xuXG4gIC8vIFRoZSB1c2VyJ3Mgb3duIGNsaWVudDogdGhlIGV4aXN0aW5nIFJMUyB3cml0ZSBydWxlcyBkZWNpZGUgKGUuZy4gYSBzZXR0ZXIgZWRpdHMgb25seSBzYWxlcyBtZWV0aW5ncyB0aGV5IGJvb2tlZCkuXG4gIGNvbnN0IHRhYmxlID0gcmVmLmtpbmQgPT09ICdzYWxlc19hcHBvaW50bWVudCcgPyAncHJvc3BlY3Rfc2FsZXNfYXBwb2ludG1lbnRzJyA6ICdhcHBvaW50bWVudHMnO1xuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBjdHgudXNlckRiLmZyb20odGFibGUpLnVwZGF0ZSh7IHN0YXR1cyB9KS5lcSgnaWQnLCByZWYuaWQpLnNlbGVjdCgnaWQnKTtcbiAgaWYgKGVycm9yIHx8ICEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiByZWYua2luZCA9PT0gJ3NhbGVzX2FwcG9pbnRtZW50JyA/ICdPbmx5IGFuIGFkbWluIG9yIHRoZSBzZXR0ZXIgd2hvIGJvb2tlZCB0aGlzIG1lZXRpbmcgY2FuIGNoYW5nZSBpdC4nIDogJ1RoaXMgYXBwb2ludG1lbnQgY291bGQgbm90IGJlIHVwZGF0ZWQuJyB9O1xuICB9XG5cbiAgaWYgKHJlZi5raW5kID09PSAnYXBwb2ludG1lbnQnICYmIHJlZi5sZWFkSWQgJiYgc3RhdHVzID09PSAnaGVsZCcpIHtcbiAgICAvLyBBIGhlbGQgY2FsbCB3aXRoIHRoZSBIb21lUXVvdGUgdGVhbSBpcyBub3QgdGhlIGNvbnRyYWN0b3IgYXBwb2ludG1lbnQ6IHRoZSBsZWFkJ3Mgc3RhZ2Ugc3RheXMgd2hlcmUgaXQgaXMuXG4gICAgY29uc3QgdGVhbUNhbGwgPSByZWYuY2FsZW5kYXI/LmtpbmQgPT09ICd0ZWFtJztcbiAgICBpZiAoIXRlYW1DYWxsKSBhd2FpdCBjdHgudXNlckRiLmZyb20oJ2xlYWRzJykudXBkYXRlKHsgc3RhdHVzOiAnYXBwb2ludG1lbnRfY29tcGxldGVkJyB9KS5lcSgnaWQnLCByZWYubGVhZElkKTtcbiAgICBjb25zdCBjb250cmFjdG9ySWQgPSByZWYuY2FsZW5kYXI/LmNvbnRyYWN0b3JJZCA/PyByZWYudmlzaXRDb250cmFjdG9ySWQ7XG4gICAgYXdhaXQgY3R4LnVzZXJEYi5mcm9tKCdsZWFkX2FjdGl2aXRpZXMnKS5pbnNlcnQoe1xuICAgICAgbGVhZF9pZDogcmVmLmxlYWRJZCwgYWN0b3JfaWQ6IGN0eC5wcm9maWxlLmlkLCB0eXBlOiAnYXBwb2ludG1lbnQnLCBib2R5OiB0ZWFtQ2FsbCA/ICdDYWxsIHdpdGggdGhlIEhvbWVRdW90ZSB0ZWFtIGhlbGQnIDogJ0FwcG9pbnRtZW50IGNvbXBsZXRlZCcsXG4gICAgICAvLyBDb250cmFjdG9yLWF1dGhvcmVkIGVudHJpZXMgbXVzdCBuYW1lIHRoZWlyIG93biBjb21wYW55IChhY3Rpdml0aWVzX2luc2VydCBSTFMpLlxuICAgICAgbWV0YWRhdGE6IHsgYXBwb2ludG1lbnRfaWQ6IHJlZi5pZCwgLi4uKGNvbnRyYWN0b3JJZCA/IHsgY29udHJhY3Rvcl9pZDogY29udHJhY3RvcklkIH0gOiB7fSkgfSxcbiAgICB9KTtcbiAgfVxuICBhZnRlckNoYW5nZShyZWYubGVhZElkKTtcbiAgaWYgKHJlZi5raW5kID09PSAnc2FsZXNfYXBwb2ludG1lbnQnKSByZXZhbGlkYXRlUGF0aCgnL2FwcC9jYWxscy9hcHBvaW50bWVudHMnKTtcbiAgcmV0dXJuIHsgb2s6IHRydWUgfTtcbn1cblxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4vKiBDYWxlbmRhciBzZXR0aW5ncyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQ6IHN0cmluZyk6IFByb21pc2U8eyBjdHg6IEN0eDsgY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciB9IHwgeyBlcnJvcjogc3RyaW5nIH0+IHtcbiAgY29uc3QgY3R4ID0gYXdhaXQgY29udGV4dCgpO1xuICBpZiAoIWN0eCkgcmV0dXJuIHsgZXJyb3I6IGRlbmllZC5lcnJvciB9O1xuICBjb25zdCBjYWxlbmRhciA9IGF3YWl0IHZpc2libGVDYWxlbmRhcihjdHgudXNlckRiLCBjYWxlbmRhcklkKTtcbiAgaWYgKCFjYWxlbmRhcikgcmV0dXJuIHsgZXJyb3I6ICdDYWxlbmRhciBub3QgZm91bmQnIH07XG4gIGlmICghY2FuTWFuYWdlQ2FsZW5kYXIoY3R4LnZpZXdlciwgY2FsZW5kYXIpKSByZXR1cm4geyBlcnJvcjogJ09ubHkgYSBIb21lUXVvdGUgYWRtaW4gb3IgdGhlIGNvbXBhbnkgb3duZXIgY2FuIGNoYW5nZSB0aGlzIGNhbGVuZGFyLicgfTtcbiAgcmV0dXJuIHsgY3R4LCBjYWxlbmRhciB9O1xufVxuXG5jb25zdCBmaWVsZCA9IChmOiBGb3JtRGF0YSwgazogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IHYgPSBmLmdldChrKTtcbiAgcmV0dXJuIHYgPT09IG51bGwgPyBudWxsIDogU3RyaW5nKHYpLnRyaW0oKTtcbn07XG5jb25zdCBpbnRGaWVsZCA9IChsbzogbnVtYmVyLCBoaTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpID0+IHouY29lcmNlLm51bWJlcih7IGludmFsaWRfdHlwZV9lcnJvcjogbWVzc2FnZSB9KS5pbnQobWVzc2FnZSkubWluKGxvLCBtZXNzYWdlKS5tYXgoaGksIG1lc3NhZ2UpO1xuXG5jb25zdCBzZXR0aW5nc1NjaGVtYSA9IHpcbiAgLm9iamVjdCh7XG4gICAgbmFtZTogei5zdHJpbmcoKS5taW4oMSwgJ0dpdmUgdGhlIGNhbGVuZGFyIGEgbmFtZScpLm1heCgxMjAsICdVc2UgMTIwIGNoYXJhY3RlcnMgb3IgZmV3ZXInKSxcbiAgICB0aW1lem9uZTogei5zdHJpbmcoKS5yZWZpbmUoaXNWYWxpZFRpbWVab25lLCAnUGljayBhIHZhbGlkIHRpbWUgem9uZScpLFxuICAgIGR1cmF0aW9uX21pbnV0ZXM6IGludEZpZWxkKDEwLCAyNDAsICdDYWxsIGxlbmd0aCBtdXN0IGJlIDEw4oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogaW50RmllbGQoNSwgMjQwLCAnU3RhcnQgdGltZXMgbXVzdCBiZSBldmVyeSA14oCTMjQwIG1pbnV0ZXMnKSxcbiAgICBidWZmZXJfbWludXRlczogaW50RmllbGQoMCwgMjQwLCAnQnVmZmVyIG11c3QgYmUgMOKAkzI0MCBtaW51dGVzJyksXG4gICAgbWluX25vdGljZV9taW51dGVzOiBpbnRGaWVsZCgwLCA0MzIwMCwgJ01pbmltdW0gbm90aWNlIG11c3QgYmUgMOKAkzcyMCBob3VycycpLFxuICAgIGhvcml6b25fZGF5czogaW50RmllbGQoMSwgMTIwLCAnQm9vayBhaGVhZCBtdXN0IGJlIDHigJMxMjAgZGF5cycpLFxuICAgIG1heF9wZXJfZGF5OiBpbnRGaWVsZCgxLCAxMDAsICdNYXggcGVyIGRheSBtdXN0IGJlIDHigJMxMDAnKS5udWxsYWJsZSgpLFxuICAgIG1lZXRpbmdfdHlwZTogei5lbnVtKFsncGhvbmUnLCAndmlkZW8nXSksXG4gICAgdmlkZW9fbGluazogei5zdHJpbmcoKS5tYXgoNTAwKS5yZWdleCgvXmh0dHBzOlxcL1xcLy8sICdUaGUgdmlkZW8gbGluayBtdXN0IHN0YXJ0IHdpdGggaHR0cHM6Ly8nKS5udWxsYWJsZSgpLFxuICAgIGFjdGl2ZTogei5ib29sZWFuKCksXG4gIH0pXG4gIC5yZWZpbmUoKHMpID0+IHMubWVldGluZ190eXBlICE9PSAndmlkZW8nIHx8ICEhcy52aWRlb19saW5rLCB7IG1lc3NhZ2U6ICdBZGQgdGhlIHZpZGVvIGxpbmsgY2FsbGVycyB3aWxsIGpvaW4nLCBwYXRoOiBbJ3ZpZGVvX2xpbmsnXSB9KTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJTZXR0aW5ncyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgY29uc3Qgbm90aWNlID0gZmllbGQoZm9ybURhdGEsICdtaW5fbm90aWNlX2hvdXJzJyk7XG4gIGNvbnN0IHBhcnNlZCA9IHNldHRpbmdzU2NoZW1hLnNhZmVQYXJzZSh7XG4gICAgbmFtZTogZmllbGQoZm9ybURhdGEsICduYW1lJyksXG4gICAgdGltZXpvbmU6IGZpZWxkKGZvcm1EYXRhLCAndGltZXpvbmUnKSxcbiAgICBkdXJhdGlvbl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2R1cmF0aW9uX21pbnV0ZXMnKSxcbiAgICBzbG90X3N0ZXBfbWludXRlczogZmllbGQoZm9ybURhdGEsICdzbG90X3N0ZXBfbWludXRlcycpLFxuICAgIGJ1ZmZlcl9taW51dGVzOiBmaWVsZChmb3JtRGF0YSwgJ2J1ZmZlcl9taW51dGVzJykgfHwgMCxcbiAgICBtaW5fbm90aWNlX21pbnV0ZXM6IG5vdGljZSA/IE1hdGgucm91bmQoTnVtYmVyKG5vdGljZSkgKiA2MCkgOiAwLFxuICAgIGhvcml6b25fZGF5czogZmllbGQoZm9ybURhdGEsICdob3Jpem9uX2RheXMnKSxcbiAgICBtYXhfcGVyX2RheTogZmllbGQoZm9ybURhdGEsICdtYXhfcGVyX2RheScpIHx8IG51bGwsXG4gICAgbWVldGluZ190eXBlOiBmaWVsZChmb3JtRGF0YSwgJ21lZXRpbmdfdHlwZScpLFxuICAgIHZpZGVvX2xpbms6IGZpZWxkKGZvcm1EYXRhLCAndmlkZW9fbGluaycpIHx8IG51bGwsXG4gICAgYWN0aXZlOiBmb3JtRGF0YS5nZXQoJ2FjdGl2ZScpID09PSAnb24nLFxuICB9KTtcbiAgaWYgKCFwYXJzZWQuc3VjY2VzcykgcmV0dXJuIHsgZXJyb3I6IHBhcnNlZC5lcnJvci5pc3N1ZXNbMF0/Lm1lc3NhZ2UgPz8gJ0NoZWNrIHRoZSBzZXR0aW5ncycgfTtcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJzJykudXBkYXRlKHBhcnNlZC5kYXRhKS5lcSgnaWQnLCBtLmNhbGVuZGFyLmlkKS5zZWxlY3QoJ2lkJyk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgaWYgKCEoZGF0YSBhcyBhbnlbXSB8IG51bGwpPy5sZW5ndGgpIHJldHVybiB7IGVycm9yOiAnWW91IGNhbuKAmXQgY2hhbmdlIHRoaXMgY2FsZW5kYXIuJyB9O1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbiAgcmV0dXJuIHsgc3VjY2VzczogJ1NldHRpbmdzIHNhdmVkJyB9O1xufVxuXG5jb25zdCBydWxlU2NoZW1hID0gelxuICAub2JqZWN0KHsgd2Vla2RheTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDYpLCBzdGFydE1pbnV0ZTogei5udW1iZXIoKS5pbnQoKS5taW4oMCkubWF4KDE0MzkpLCBlbmRNaW51dGU6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgxNDQwKSB9KVxuICAucmVmaW5lKChyKSA9PiByLmVuZE1pbnV0ZSA+IHIuc3RhcnRNaW51dGUsICdFbmQgdGltZSBtdXN0IGJlIGFmdGVyIHN0YXJ0IHRpbWUnKTtcblxuLyoqIFJlcGxhY2UgdGhlIGNhbGVuZGFyJ3Mgd2Vla2x5IGhvdXJzIChXZWVrbHlFZGl0b3IncyBgcnVsZXNgIEpTT04pLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVCb29raW5nQ2FsZW5kYXJSdWxlcyhjYWxlbmRhcklkOiBzdHJpbmcsIF9wcmV2OiBTZXR0aW5nc1N0YXRlLCBmb3JtRGF0YTogRm9ybURhdGEpOiBQcm9taXNlPFNldHRpbmdzU3RhdGU+IHtcbiAgY29uc3QgbSA9IGF3YWl0IG1hbmFnZWFibGVDYWxlbmRhcihjYWxlbmRhcklkKTtcbiAgaWYgKCdlcnJvcicgaW4gbSkgcmV0dXJuIHsgZXJyb3I6IG0uZXJyb3IgfTtcbiAgbGV0IHJhdzogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICByYXcgPSBKU09OLnBhcnNlKFN0cmluZyhmb3JtRGF0YS5nZXQoJ3J1bGVzJykgPz8gJ1tdJykpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4geyBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIHRoZSBob3VycycgfTtcbiAgfVxuICBjb25zdCBwYXJzZWQgPSB6LmFycmF5KHJ1bGVTY2hlbWEpLm1heCg1MCkuc2FmZVBhcnNlKHJhdyk7XG4gIGlmICghcGFyc2VkLnN1Y2Nlc3MpIHJldHVybiB7IGVycm9yOiBwYXJzZWQuZXJyb3IuaXNzdWVzWzBdPy5tZXNzYWdlID8/ICdDaGVjayB0aGUgaG91cnMnIH07XG4gIGNvbnN0IHJ1bGVzID0gcGFyc2VkLmRhdGE7XG4gIGZvciAobGV0IGQgPSAwOyBkIDwgNzsgZCsrKSB7XG4gICAgY29uc3QgZGF5ID0gcnVsZXMuZmlsdGVyKChyKSA9PiByLndlZWtkYXkgPT09IGQpLnNvcnQoKGEsIGIpID0+IGEuc3RhcnRNaW51dGUgLSBiLnN0YXJ0TWludXRlKTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGRheS5sZW5ndGg7IGkrKykgaWYgKGRheVtpXS5zdGFydE1pbnV0ZSA8IGRheVtpIC0gMV0uZW5kTWludXRlKSByZXR1cm4geyBlcnJvcjogJ0hvdXJzIG9uIHRoZSBzYW1lIGRheSBvdmVybGFwJyB9O1xuICB9XG4gIGNvbnN0IGRiID0gbS5jdHgudXNlckRiO1xuICBjb25zdCB7IGVycm9yOiBkZWxFcnJvciB9ID0gYXdhaXQgZGIuZnJvbSgnYm9va2luZ19jYWxlbmRhcl9ydWxlcycpLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpO1xuICBpZiAoZGVsRXJyb3IpIHJldHVybiB7IGVycm9yOiBkZWxFcnJvci5tZXNzYWdlIH07XG4gIGlmIChydWxlcy5sZW5ndGgpIHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBkYi5mcm9tKCdib29raW5nX2NhbGVuZGFyX3J1bGVzJykuaW5zZXJ0KFxuICAgICAgcnVsZXMubWFwKChyKSA9PiAoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgd2Vla2RheTogci53ZWVrZGF5LCBzdGFydF9taW51dGU6IHIuc3RhcnRNaW51dGUsIGVuZF9taW51dGU6IHIuZW5kTWludXRlIH0pKVxuICAgICk7XG4gICAgaWYgKGVycm9yKSByZXR1cm4geyBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICB9XG4gIHJlZnJlc2hDYWxlbmRhcigpO1xuICByZXR1cm4geyBzdWNjZXNzOiBydWxlcy5sZW5ndGggPyAnSG91cnMgc2F2ZWQnIDogJ0hvdXJzIGNsZWFyZWQ6IG5vdGhpbmcgY2FuIGJlIGJvb2tlZCB1bnRpbCB5b3UgYWRkIHNvbWUnIH07XG59XG5cbi8qKiBQZW9wbGUgd2hvIG1heSBob3N0IGEgY2FsZW5kYXI6IHRlYW0gLyBzYWxlcyB0YWtlIEhvbWVRdW90ZSBhZG1pbnMgKyBzZXR0ZXJzOyBhIGNvbnRyYWN0b3IgY2FsZW5kYXIgaXRzIG93biBjb21wYW55J3MgdXNlcnMuICovXG5hc3luYyBmdW5jdGlvbiBlbGlnaWJsZUhvc3QoY2FsZW5kYXI6IEJvb2tpbmdDYWxlbmRhciwgdXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBkYXRhOiBwIH0gPSBhd2FpdCBjcmVhdGVBZG1pbkNsaWVudCgpLmZyb20oJ3Byb2ZpbGVzJykuc2VsZWN0KCdpZCwgcm9sZSwgY29udHJhY3Rvcl9pZCwgaXNfYWN0aXZlJykuZXEoJ2lkJywgdXNlcklkKS5tYXliZVNpbmdsZSgpO1xuICBpZiAoIXAgfHwgcC5pc19hY3RpdmUgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBjYWxlbmRhci5raW5kID09PSAnY29udHJhY3RvcicgPyBwLnJvbGUgPT09ICdjb250cmFjdG9yJyAmJiBwLmNvbnRyYWN0b3JfaWQgPT09IGNhbGVuZGFyLmNvbnRyYWN0b3JJZCA6IHAucm9sZSA9PT0gJ2FkbWluJyB8fCBwLnJvbGUgPT09ICdzZXR0ZXInO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkQm9va2luZ0NhbGVuZGFyTWVtYmVyKGNhbGVuZGFySWQ6IHN0cmluZywgX3ByZXY6IFNldHRpbmdzU3RhdGUsIGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8U2V0dGluZ3NTdGF0ZT4ge1xuICBjb25zdCBtID0gYXdhaXQgbWFuYWdlYWJsZUNhbGVuZGFyKGNhbGVuZGFySWQpO1xuICBpZiAoJ2Vycm9yJyBpbiBtKSByZXR1cm4geyBlcnJvcjogbS5lcnJvciB9O1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgaWYgKCF1dWlkLnNhZmVQYXJzZSh1c2VySWQpLnN1Y2Nlc3MgfHwgIShhd2FpdCBlbGlnaWJsZUhvc3QobS5jYWxlbmRhciwgdXNlcklkKSkpIHJldHVybiB7IGVycm9yOiAnUGljayBhIHBlcnNvbiB0byBhZGQnIH07XG4gIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IG0uY3R4LnVzZXJEYlxuICAgIC5mcm9tKCdib29raW5nX2NhbGVuZGFyX21lbWJlcnMnKVxuICAgIC51cHNlcnQoeyBjYWxlbmRhcl9pZDogbS5jYWxlbmRhci5pZCwgdXNlcl9pZDogdXNlcklkLCBub3RpZnk6IHRydWUgfSwgeyBvbkNvbmZsaWN0OiAnY2FsZW5kYXJfaWQsdXNlcl9pZCcgfSk7XG4gIGlmIChlcnJvcikgcmV0dXJuIHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgcmVmcmVzaENhbGVuZGFyKCk7XG4gIHJldHVybiB7IHN1Y2Nlc3M6ICdIb3N0IGFkZGVkJyB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlQm9va2luZ0NhbGVuZGFyTWVtYmVyKGZvcm1EYXRhOiBGb3JtRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjYWxlbmRhcklkID0gZmllbGQoZm9ybURhdGEsICdjYWxlbmRhcl9pZCcpID8/ICcnO1xuICBjb25zdCB1c2VySWQgPSBmaWVsZChmb3JtRGF0YSwgJ3VzZXJfaWQnKSA/PyAnJztcbiAgY29uc3Qgb3AgPSBmaWVsZChmb3JtRGF0YSwgJ29wJyk7XG4gIGNvbnN0IG0gPSBhd2FpdCBtYW5hZ2VhYmxlQ2FsZW5kYXIoY2FsZW5kYXJJZCk7XG4gIGlmICgnZXJyb3InIGluIG0gfHwgIXV1aWQuc2FmZVBhcnNlKHVzZXJJZCkuc3VjY2VzcykgcmV0dXJuO1xuICBjb25zdCBtZW1iZXJzID0gbS5jdHgudXNlckRiLmZyb20oJ2Jvb2tpbmdfY2FsZW5kYXJfbWVtYmVycycpO1xuICBpZiAob3AgPT09ICdyZW1vdmUnKSBhd2FpdCBtZW1iZXJzLmRlbGV0ZSgpLmVxKCdjYWxlbmRhcl9pZCcsIG0uY2FsZW5kYXIuaWQpLmVxKCd1c2VyX2lkJywgdXNlcklkKTtcbiAgZWxzZSBpZiAob3AgPT09ICdub3RpZnlfb24nIHx8IG9wID09PSAnbm90aWZ5X29mZicpIGF3YWl0IG1lbWJlcnMudXBkYXRlKHsgbm90aWZ5OiBvcCA9PT0gJ25vdGlmeV9vbicgfSkuZXEoJ2NhbGVuZGFyX2lkJywgbS5jYWxlbmRhci5pZCkuZXEoJ3VzZXJfaWQnLCB1c2VySWQpO1xuICByZWZyZXNoQ2FsZW5kYXIoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoic1NBcVhzQiJ9
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calendar/event-sheet.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EventSheet",
    ()=>EventSheet
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarClock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar-clock.js [app-client] (ecmascript) <export default as CalendarClock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-client] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mail.js [app-client] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$video$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Video$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/video.js [app-client] (ecmascript) <export default as Video>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$7eda6b__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/lib/actions/data:7eda6b [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$837f39__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/lib/actions/data:837f39 [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$1596fd__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/lib/actions/data:1596fd [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calls$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calls/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2d$label$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/booking/zone-label.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/textarea.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/panel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$slot$2d$chooser$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/slot-chooser.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/view.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/availability/time.ts [app-client] (ecmascript)");
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
;
;
const MEETING = {
    phone: 'Phone call',
    video: 'Video call',
    in_person: 'In person'
};
function EventSheet({ event, calendarId, timeZone, canWork, allowOverride, nowMs, onClose }) {
    _s();
    const [mode, setMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('details');
    const [chosen, setChosen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [reason, setReason] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [notice, setNotice] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [pending, start] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"])();
    const key = event ? `${event.kind}:${event.id}` : '';
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "EventSheet.useEffect": ()=>{
            setMode('details');
            setChosen(null);
            setReason('');
            setError(null);
            setNotice(null);
        }
    }["EventSheet.useEffect"], [
        key
    ]);
    if (!event) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CalendarPanel"], {
        open: false,
        onOpenChange: onClose,
        title: "Appointment",
        children: null
    }, void 0, false, {
        fileName: "[project]/components/calendar/event-sheet.tsx",
        lineNumber: 60,
        columnNumber: 22
    }, this);
    const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["statusStyle"])(event.kind, event.status);
    const live = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isLive"])(event.kind, event.status);
    const canChange = canWork && live && event.kind !== 'visit' && event.startMs > nowMs;
    const canCancel = canWork && live && event.startMs > nowMs;
    const actions = canWork ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["statusActions"])(event.kind, event.status, event.startMs, nowMs) : [];
    const tel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calls$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["telHref"])(event.phone);
    const run = (fn, done)=>{
        setError(null);
        setNotice(null);
        start(async ()=>{
            const r = await fn();
            if (!r.ok) {
                setError(r.error ?? 'Something went wrong');
                return;
            }
            setMode('details');
            setChosen(null);
            setNotice(done);
        });
    };
    const footer = mode === 'reschedule' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex gap-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                variant: "outline",
                className: "flex-1",
                onClick: ()=>{
                    setMode('details');
                    setChosen(null);
                    setError(null);
                },
                disabled: pending,
                children: "Back"
            }, void 0, false, {
                fileName: "[project]/components/calendar/event-sheet.tsx",
                lineNumber: 86,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                className: "flex-1",
                disabled: !chosen || pending,
                onClick: ()=>chosen && run(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$837f39__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["rescheduleCalendarEvent"])({
                            kind: event.kind,
                            id: event.id,
                            startsAt: chosen.startsAt,
                            override: chosen.override
                        }), 'Rescheduled. The homeowner gets the new time.'),
                children: pending ? 'Saving…' : 'Move the call'
            }, void 0, false, {
                fileName: "[project]/components/calendar/event-sheet.tsx",
                lineNumber: 87,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/event-sheet.tsx",
        lineNumber: 85,
        columnNumber: 7
    }, this) : mode === 'cancel' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex gap-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                variant: "outline",
                className: "flex-1",
                onClick: ()=>{
                    setMode('details');
                    setError(null);
                },
                disabled: pending,
                children: "Keep it"
            }, void 0, false, {
                fileName: "[project]/components/calendar/event-sheet.tsx",
                lineNumber: 97,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                variant: "destructive",
                className: "flex-1",
                disabled: pending,
                onClick: ()=>run(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$7eda6b__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["cancelCalendarEvent"])({
                            kind: event.kind,
                            id: event.id,
                            reason: reason.trim() || undefined
                        }), 'Cancelled.'),
                children: pending ? 'Cancelling…' : 'Cancel the call'
            }, void 0, false, {
                fileName: "[project]/components/calendar/event-sheet.tsx",
                lineNumber: 98,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/event-sheet.tsx",
        lineNumber: 96,
        columnNumber: 7
    }, this) : undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$panel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CalendarPanel"], {
        open: true,
        onOpenChange: (o)=>{
            if (!o) onClose();
        },
        title: mode === 'reschedule' ? 'Pick a new time' : mode === 'cancel' ? 'Cancel this call?' : event.title,
        description: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["longDayLabel"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(event.startMs, timeZone).date)} · ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatRange"])(event.startMs, event.endMs, timeZone)}`,
        footer: footer,
        children: [
            error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive",
                role: "alert",
                children: error
            }, void 0, false, {
                fileName: "[project]/components/calendar/event-sheet.tsx",
                lineNumber: 117,
                columnNumber: 16
            }, this) : null,
            notice ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
                role: "status",
                children: notice
            }, void 0, false, {
                fileName: "[project]/components/calendar/event-sheet.tsx",
                lineNumber: 118,
                columnNumber: 17
            }, this) : null,
            mode === 'reschedule' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$slot$2d$chooser$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SlotChooser"], {
                calendarId: calendarId,
                calendarTimeZone: timeZone,
                reschedule: {
                    kind: event.kind,
                    id: event.id
                },
                allowOverride: allowOverride,
                value: chosen,
                onChange: setChosen
            }, void 0, false, {
                fileName: "[project]/components/calendar/event-sheet.tsx",
                lineNumber: 121,
                columnNumber: 9
            }, this) : mode === 'cancel' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted-foreground",
                        children: event.kind === 'visit' ? 'The visit is marked cancelled.' : event.kind === 'sales_appointment' ? `${event.title} gets a cancellation email.` : `${event.title} gets a cancellation text and email.`
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 131,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        htmlFor: "cancel-reason",
                        className: "text-sm font-medium",
                        children: "Reason (optional)"
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 138,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Textarea"], {
                        id: "cancel-reason",
                        value: reason,
                        maxLength: 500,
                        onChange: (e)=>setReason(e.target.value),
                        rows: 3,
                        placeholder: "e.g. Homeowner asked to cancel"
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 139,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/event-sheet.tsx",
                lineNumber: 130,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2 text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        "aria-hidden": true,
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('size-2 rounded-full', s.dot)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 145,
                                        columnNumber: 15
                                    }, this),
                                    s.label
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 144,
                                columnNumber: 13
                            }, this),
                            event.rescheduleCount > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-muted-foreground",
                                children: [
                                    "Rescheduled ",
                                    event.rescheduleCount,
                                    "×"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 148,
                                columnNumber: 42
                            }, this) : null,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs text-muted-foreground",
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$booking$2f$zone$2d$label$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["zoneLabel"])(event.startMs, timeZone)
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 149,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 143,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                        className: "grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-sm",
                        children: [
                            event.subtitle ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                        className: "text-muted-foreground",
                                        children: event.kind === 'sales_appointment' ? 'Company' : 'Project'
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 153,
                                        columnNumber: 34
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                        children: event.subtitle
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 153,
                                        columnNumber: 137
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            event.city ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                        className: "text-muted-foreground",
                                        children: "City"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 154,
                                        columnNumber: 30
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                        children: event.city
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 154,
                                        columnNumber: 77
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            event.contractorName ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                        className: "text-muted-foreground",
                                        children: "Contractor"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 155,
                                        columnNumber: 40
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                        children: event.contractorName
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 155,
                                        columnNumber: 93
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            event.meetingType ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                        className: "text-muted-foreground",
                                        children: "Meeting"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 156,
                                        columnNumber: 37
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                        children: MEETING[event.meetingType] ?? event.meetingType
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 156,
                                        columnNumber: 87
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            event.location && ![
                                'Phone call',
                                'Video call'
                            ].includes(event.location) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                        className: "text-muted-foreground",
                                        children: "Where"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 158,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                        className: "break-words",
                                        children: /^https:\/\//.test(event.location) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                            href: event.location,
                                            target: "_blank",
                                            rel: "noreferrer",
                                            className: "inline-flex items-center gap-1 underline",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$video$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Video$3e$__["Video"], {
                                                    className: "size-3.5",
                                                    "aria-hidden": true
                                                }, void 0, false, {
                                                    fileName: "[project]/components/calendar/event-sheet.tsx",
                                                    lineNumber: 158,
                                                    columnNumber: 242
                                                }, this),
                                                "Join link"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/calendar/event-sheet.tsx",
                                            lineNumber: 158,
                                            columnNumber: 131
                                        }, this) : event.location
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 158,
                                        columnNumber: 65
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sourceLabel"])(event.source) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                        className: "text-muted-foreground",
                                        children: "Booked via"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 160,
                                        columnNumber: 45
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sourceLabel"])(event.source)
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 160,
                                        columnNumber: 98
                                    }, this)
                                ]
                            }, void 0, true) : null,
                            event.cancelReason ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                        className: "text-muted-foreground",
                                        children: "Reason"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 161,
                                        columnNumber: 38
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                        children: event.cancelReason
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 161,
                                        columnNumber: 87
                                    }, this)
                                ]
                            }, void 0, true) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 152,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-2 sm:grid-cols-2",
                        children: [
                            tel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: tel,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buttonVariants"])({
                                    size: 'lg'
                                }), 'w-full'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                        "aria-hidden": true
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 167,
                                        columnNumber: 17
                                    }, this),
                                    " Call ",
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calls$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fmtPhone"])(event.phone)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 166,
                                columnNumber: 15
                            }, this) : null,
                            event.email ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: `mailto:${event.email}`,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buttonVariants"])({
                                    variant: 'outline',
                                    size: 'lg'
                                }), 'w-full min-w-0'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                        "aria-hidden": true
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 172,
                                        columnNumber: 17
                                    }, this),
                                    " ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "truncate",
                                        children: "Email"
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 172,
                                        columnNumber: 38
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 171,
                                columnNumber: 15
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 164,
                        columnNumber: 11
                    }, this),
                    event.design ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        "aria-labelledby": "design-heading",
                        className: "space-y-2 rounded-xl border p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                id: "design-heading",
                                className: "text-sm font-semibold",
                                children: "Their design"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 179,
                                columnNumber: 15
                            }, this),
                            event.design.photo ? // Remote estimator photos (example designs) on the site's own domain; a plain img keeps this dependency-free.
                            // eslint-disable-next-line @next/next/no-img-element
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: event.design.photo.url,
                                alt: event.design.photo.alt,
                                className: "aspect-[4/3] w-full rounded-lg bg-muted object-cover",
                                loading: "lazy"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 183,
                                columnNumber: 17
                            }, this) : null,
                            event.design.range ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-muted-foreground",
                                        children: "Ballpark "
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 185,
                                        columnNumber: 60
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-medium",
                                        children: event.design.range
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 185,
                                        columnNumber: 116
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 185,
                                columnNumber: 37
                            }, this) : null,
                            event.design.lines.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "list-disc space-y-0.5 pl-5 text-sm",
                                children: event.design.lines.map((l, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: l
                                    }, i, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 188,
                                        columnNumber: 53
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 187,
                                columnNumber: 17
                            }, this) : null,
                            event.design.designUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: event.design.designUrl,
                                target: "_blank",
                                rel: "noreferrer",
                                className: "inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline",
                                children: [
                                    "Open their design ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                        className: "size-3.5",
                                        "aria-hidden": true
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 193,
                                        columnNumber: 37
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 192,
                                columnNumber: 17
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 178,
                        columnNumber: 13
                    }, this) : null,
                    event.notes ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "space-y-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-sm font-semibold",
                                children: "Notes"
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 201,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "whitespace-pre-wrap text-sm text-muted-foreground",
                                children: event.notes
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 202,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 200,
                        columnNumber: 13
                    }, this) : null,
                    event.leadId || event.prospectId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: event.leadId ? `/app/leads/${event.leadId}` : `/app/calls/${event.prospectId}`,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buttonVariants"])({
                            variant: 'outline'
                        }), 'w-full'),
                        children: event.leadId ? 'Open the lead' : 'Open the prospect'
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 207,
                        columnNumber: 13
                    }, this) : null,
                    actions.length || canChange || canCancel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        "aria-label": "Actions",
                        className: "space-y-2 border-t pt-4",
                        children: [
                            actions.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-2",
                                children: actions.map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                        variant: "outline",
                                        disabled: pending,
                                        onClick: ()=>run(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$actions$2f$data$3a$1596fd__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["setCalendarEventStatus"])({
                                                    kind: event.kind,
                                                    id: event.id,
                                                    status: a.value
                                                }), `Marked ${a.label.toLowerCase()}.`),
                                        children: a.label
                                    }, a.value, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 220,
                                        columnNumber: 21
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 218,
                                columnNumber: 17
                            }, this) : null,
                            canChange ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                variant: "outline",
                                className: "w-full",
                                disabled: pending,
                                onClick: ()=>{
                                    setMode('reschedule');
                                    setNotice(null);
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2d$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CalendarClock$3e$__["CalendarClock"], {
                                        "aria-hidden": true
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 233,
                                        columnNumber: 19
                                    }, this),
                                    " Reschedule"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 232,
                                columnNumber: 17
                            }, this) : null,
                            canCancel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                variant: "destructive-outline",
                                className: "w-full",
                                disabled: pending,
                                onClick: ()=>{
                                    setMode('cancel');
                                    setNotice(null);
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                                        "aria-hidden": true
                                    }, void 0, false, {
                                        fileName: "[project]/components/calendar/event-sheet.tsx",
                                        lineNumber: 238,
                                        columnNumber: 19
                                    }, this),
                                    " Cancel"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/calendar/event-sheet.tsx",
                                lineNumber: 237,
                                columnNumber: 17
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 216,
                        columnNumber: 13
                    }, this) : null,
                    event.kind === 'visit' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-muted-foreground",
                        children: "On-site visits are booked from the lead. They block this calendar so no call lands on top of one."
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/event-sheet.tsx",
                        lineNumber: 244,
                        columnNumber: 13
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/event-sheet.tsx",
                lineNumber: 142,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/event-sheet.tsx",
        lineNumber: 110,
        columnNumber: 5
    }, this);
}
_s(EventSheet, "MPf2vAmOn0zXxUsHGuL1Mu8y+h0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"]
    ];
});
_c = EventSheet;
var _c;
__turbopack_context__.k.register(_c, "EventSheet");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calendar/now-line.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NowLine",
    ()=>NowLine,
    "useNow",
    ()=>useNow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/availability/time.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
function NowLine({ date, timeZone, startHour, endHour, pxPerMinute, initialNowMs }) {
    _s();
    const nowMs = useNow(initialNowMs);
    const here = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$availability$2f$time$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["localParts"])(nowMs, timeZone);
    if (here.date !== date) return null;
    const minute = here.minuteOfDay;
    if (minute < startHour * 60 || minute > endHour * 60) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "aria-hidden": true,
        "data-calendar-now": "",
        className: "pointer-events-none absolute inset-x-0 z-20 h-0 border-t-2 border-red-500",
        style: {
            top: (minute - startHour * 60) * pxPerMinute
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "absolute -left-1 -top-[5px] size-2 rounded-full bg-red-500"
        }, void 0, false, {
            fileName: "[project]/components/calendar/now-line.tsx",
            lineNumber: 38,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/calendar/now-line.tsx",
        lineNumber: 32,
        columnNumber: 5
    }, this);
}
_s(NowLine, "/hg60rDJRdK5bf/WHBdClDzf1RA=", false, function() {
    return [
        useNow
    ];
});
_c = NowLine;
function useNow(initialNowMs) {
    _s1();
    const [now, setNow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialNowMs);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useNow.useEffect": ()=>{
            setNow(Date.now());
            const t = setInterval({
                "useNow.useEffect.t": ()=>setNow(Date.now())
            }["useNow.useEffect.t"], 60_000);
            return ({
                "useNow.useEffect": ()=>clearInterval(t)
            })["useNow.useEffect"];
        }
    }["useNow.useEffect"], []);
    return now;
}
_s1(useNow, "fK3Fwc4sO6wg0WiQ5hhlIoDtWMI=");
var _c;
__turbopack_context__.k.register(_c, "NowLine");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calendar/time-grid.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PX_PER_MINUTE",
    ()=>PX_PER_MINUTE,
    "TimeGrid",
    ()=>TimeGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/booking/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$now$2d$line$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/now-line.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/view.ts [app-client] (ecmascript)");
'use client';
;
;
;
;
;
const PX_PER_MINUTE = 0.8;
const hourLabel = (h)=>h === 0 || h === 24 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;
function TimeGrid({ days, placedByDay, rules, timeZone, startHour, endHour, today, initialNowMs, onSelect, className }) {
    const hours = Array.from({
        length: endHour - startHour
    }, (_, i)=>startHour + i);
    const height = (endHour - startHour) * 60 * PX_PER_MINUTE;
    const week = days.length > 1;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('overflow-x-auto rounded-xl border bg-card', className),
        "data-calendar-grid": week ? 'week' : 'day',
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('grid', week ? 'min-w-[760px]' : ''),
            style: {
                gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))`
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "sticky left-0 z-10 border-b bg-card"
                }, void 0, false, {
                    fileName: "[project]/components/calendar/time-grid.tsx",
                    lineNumber: 49,
                    columnNumber: 9
                }, this),
                days.map((d)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('border-b border-l px-2 py-2 text-center text-xs font-medium', d === today ? 'text-primary' : 'text-muted-foreground'),
                        "aria-current": d === today ? 'date' : undefined,
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dayLabel"])(d)
                    }, d, false, {
                        fileName: "[project]/components/calendar/time-grid.tsx",
                        lineNumber: 51,
                        columnNumber: 11
                    }, this)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "sticky left-0 z-10 bg-card",
                    style: {
                        height
                    },
                    children: hours.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative text-right",
                            style: {
                                height: 60 * PX_PER_MINUTE
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "absolute -top-2 right-2 text-[11px] tabular-nums text-muted-foreground",
                                children: h === startHour ? '' : hourLabel(h)
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/time-grid.tsx",
                                lineNumber: 64,
                                columnNumber: 15
                            }, this)
                        }, h, false, {
                            fileName: "[project]/components/calendar/time-grid.tsx",
                            lineNumber: 63,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/calendar/time-grid.tsx",
                    lineNumber: 61,
                    columnNumber: 9
                }, this),
                days.map((d)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative border-l bg-muted/50",
                        style: {
                            height
                        },
                        "data-calendar-day": d,
                        children: [
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openBands"])(rules, d).map((b, i)=>{
                                const top = Math.max(0, (b.startMin - startHour * 60) * PX_PER_MINUTE);
                                const bottom = Math.min(height, (b.endMin - startHour * 60) * PX_PER_MINUTE);
                                return bottom > top ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    "aria-hidden": true,
                                    className: "absolute inset-x-0 bg-background",
                                    style: {
                                        top,
                                        height: bottom - top
                                    }
                                }, i, false, {
                                    fileName: "[project]/components/calendar/time-grid.tsx",
                                    lineNumber: 74,
                                    columnNumber: 37
                                }, this) : null;
                            }),
                            hours.map((h, i)=>i === 0 ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    "aria-hidden": true,
                                    className: "absolute inset-x-0 border-t border-border/70",
                                    style: {
                                        top: i * 60 * PX_PER_MINUTE
                                    }
                                }, h, false, {
                                    fileName: "[project]/components/calendar/time-grid.tsx",
                                    lineNumber: 77,
                                    columnNumber: 32
                                }, this)),
                            (placedByDay[d] ?? []).map((p)=>{
                                const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["statusStyle"])(p.event.kind, p.event.status);
                                const top = Math.max(0, (p.startMin - startHour * 60) * PX_PER_MINUTE);
                                const h = Math.max(20, (p.endMin - p.startMin) * PX_PER_MINUTE - 2);
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>onSelect(p.event),
                                    "data-calendar-event": p.event.id,
                                    "data-status": p.event.status,
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('absolute z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left text-xs leading-tight shadow-xs outline-none transition-[filter] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50', s.block),
                                    style: {
                                        top,
                                        height: h,
                                        left: `calc(${p.lane / p.lanes * 100}% + 2px)`,
                                        width: `calc(${100 / p.lanes}% - 4px)`
                                    },
                                    "aria-label": `${p.event.title}, ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatTime"])(p.event.startMs, timeZone)}, ${s.label}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "block truncate font-semibold",
                                            children: p.event.title
                                        }, void 0, false, {
                                            fileName: "[project]/components/calendar/time-grid.tsx",
                                            lineNumber: 102,
                                            columnNumber: 19
                                        }, this),
                                        h >= 34 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "block truncate opacity-80",
                                            children: [
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$booking$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatTime"])(p.event.startMs, timeZone),
                                                p.event.subtitle ? ` · ${p.event.subtitle}` : ''
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/calendar/time-grid.tsx",
                                            lineNumber: 104,
                                            columnNumber: 21
                                        }, this) : null
                                    ]
                                }, `${p.event.kind}:${p.event.id}`, true, {
                                    fileName: "[project]/components/calendar/time-grid.tsx",
                                    lineNumber: 84,
                                    columnNumber: 17
                                }, this);
                            }),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$now$2d$line$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NowLine"], {
                                date: d,
                                timeZone: timeZone,
                                startHour: startHour,
                                endHour: endHour,
                                pxPerMinute: PX_PER_MINUTE,
                                initialNowMs: initialNowMs
                            }, void 0, false, {
                                fileName: "[project]/components/calendar/time-grid.tsx",
                                lineNumber: 112,
                                columnNumber: 13
                            }, this)
                        ]
                    }, d, true, {
                        fileName: "[project]/components/calendar/time-grid.tsx",
                        lineNumber: 70,
                        columnNumber: 11
                    }, this))
            ]
        }, void 0, true, {
            fileName: "[project]/components/calendar/time-grid.tsx",
            lineNumber: 47,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/calendar/time-grid.tsx",
        lineNumber: 46,
        columnNumber: 5
    }, this);
}
_c = TimeGrid;
var _c;
__turbopack_context__.k.register(_c, "TimeGrid");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/calendar/calendar-board.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CalendarBoard",
    ()=>CalendarBoard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$agenda$2d$list$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/agenda-list.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$book$2d$call$2d$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/book-call-sheet.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$event$2d$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/event-sheet.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$now$2d$line$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/now-line.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$time$2d$grid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/time-grid.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/calendar/view.ts [app-client] (ecmascript)");
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
function CalendarBoard({ calendar, mode, days, events, rules, today, nowMs, canWork, allowOverride, toolbar }) {
    _s();
    const [selectedKey, setSelectedKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [booking, setBooking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const tz = calendar.timezone;
    const now = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$now$2d$line$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNow"])(nowMs);
    const placedByDay = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CalendarBoard.useMemo[placedByDay]": ()=>Object.fromEntries(days.map({
                "CalendarBoard.useMemo[placedByDay]": (d)=>[
                        d,
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["layoutDay"])(events, d, tz)
                    ]
            }["CalendarBoard.useMemo[placedByDay]"]))
    }["CalendarBoard.useMemo[placedByDay]"], [
        days,
        events,
        tz
    ]);
    const { startHour, endHour } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CalendarBoard.useMemo": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$view$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["visibleHours"])(rules, Object.values(placedByDay).flat())
    }["CalendarBoard.useMemo"], [
        rules,
        placedByDay
    ]);
    // Look the selection up in the CURRENT events so the sheet shows fresh data after an action.
    const selected = selectedKey ? events.find((e)=>`${e.kind}:${e.id}` === selectedKey) ?? null : null;
    const select = (e)=>setSelectedKey(`${e.kind}:${e.id}`);
    const live = events.filter((e)=>e.status !== 'cancelled').length;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-3",
        "data-calendar-board": calendar.kind,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-center justify-between gap-2",
                children: [
                    toolbar,
                    canWork && calendar.active ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$book$2d$call$2d$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BookCallButton"], {
                        onClick: ()=>setBooking(true)
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/calendar-board.tsx",
                        lineNumber: 65,
                        columnNumber: 39
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/calendar-board.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-muted-foreground",
                "aria-live": "polite",
                children: [
                    live === 0 ? 'Nothing booked in this view.' : `${live} booked in this view.`,
                    !calendar.active ? ' This calendar is switched off: nobody can book it online.' : ''
                ]
            }, void 0, true, {
                fileName: "[project]/components/calendar/calendar-board.tsx",
                lineNumber: 67,
                columnNumber: 7
            }, this),
            mode === 'week' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$agenda$2d$list$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AgendaList"], {
                        className: "md:hidden",
                        days: days,
                        events: events,
                        timeZone: tz,
                        today: today,
                        onSelect: select
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/calendar-board.tsx",
                        lineNumber: 74,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$time$2d$grid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TimeGrid"], {
                        className: "hidden md:block",
                        days: days,
                        placedByDay: placedByDay,
                        rules: rules,
                        timeZone: tz,
                        startHour: startHour,
                        endHour: endHour,
                        today: today,
                        initialNowMs: nowMs,
                        onSelect: select
                    }, void 0, false, {
                        fileName: "[project]/components/calendar/calendar-board.tsx",
                        lineNumber: 75,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$time$2d$grid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TimeGrid"], {
                days: days,
                placedByDay: placedByDay,
                rules: rules,
                timeZone: tz,
                startHour: startHour,
                endHour: endHour,
                today: today,
                initialNowMs: nowMs,
                onSelect: select
            }, void 0, false, {
                fileName: "[project]/components/calendar/calendar-board.tsx",
                lineNumber: 82,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$event$2d$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EventSheet"], {
                event: selected,
                calendarId: calendar.id,
                timeZone: tz,
                canWork: canWork,
                allowOverride: allowOverride,
                nowMs: now,
                onClose: ()=>setSelectedKey(null)
            }, void 0, false, {
                fileName: "[project]/components/calendar/calendar-board.tsx",
                lineNumber: 88,
                columnNumber: 7
            }, this),
            canWork ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$book$2d$call$2d$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BookCallSheet"], {
                calendarId: calendar.id,
                calendarName: calendar.name,
                calendarKind: calendar.kind,
                timeZone: tz,
                allowOverride: allowOverride,
                open: booking,
                onOpenChange: setBooking
            }, void 0, false, {
                fileName: "[project]/components/calendar/calendar-board.tsx",
                lineNumber: 98,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/calendar-board.tsx",
        lineNumber: 62,
        columnNumber: 5
    }, this);
}
_s(CalendarBoard, "3NwW38hX2xgUmIKbZvgsWsI/DQI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$calendar$2f$now$2d$line$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNow"]
    ];
});
_c = CalendarBoard;
var _c;
__turbopack_context__.k.register(_c, "CalendarBoard");
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
"[project]/components/calendar/calendar-switcher.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CalendarSwitcher",
    ()=>CalendarSwitcher
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react-experimental/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/select.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function CalendarSwitcher({ options, current, query }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const house = options.filter((o)=>o.kind !== 'contractor');
    const contractors = options.filter((o)=>o.kind === 'contractor');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Select"], {
        "aria-label": "Calendar",
        value: current,
        className: "w-full sm:w-64",
        onChange: (e)=>{
            const qs = new URLSearchParams({
                ...query,
                cal: e.target.value
            });
            router.push(`/app/calendar?${qs.toString()}`);
        },
        children: [
            house.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("optgroup", {
                label: "HomeQuote",
                children: house.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: o.id,
                        children: o.name
                    }, o.id, false, {
                        fileName: "[project]/components/calendar/calendar-switcher.tsx",
                        lineNumber: 34,
                        columnNumber: 29
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/calendar/calendar-switcher.tsx",
                lineNumber: 33,
                columnNumber: 9
            }, this) : null,
            contractors.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("optgroup", {
                label: "Contractors",
                children: contractors.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$experimental$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: o.id,
                        children: o.name
                    }, o.id, false, {
                        fileName: "[project]/components/calendar/calendar-switcher.tsx",
                        lineNumber: 39,
                        columnNumber: 35
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/calendar/calendar-switcher.tsx",
                lineNumber: 38,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/calendar/calendar-switcher.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_s(CalendarSwitcher, "fN7XvhJ+p5oE6+Xlo0NJmXpxjC8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = CalendarSwitcher;
var _c;
__turbopack_context__.k.register(_c, "CalendarSwitcher");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_faecf3b9._.js.map