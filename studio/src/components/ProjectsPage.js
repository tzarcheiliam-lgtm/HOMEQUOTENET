import { getPendingJobs } from '../lib/pendingJobs.js';

// Where each studio keeps its finished work in this browser, and the page that opens it.
const STUDIOS = {
    image: { label: 'Image', historyKey: 'kie_history', page: 'image' },
    video: { label: 'Video', historyKey: 'video_history', page: 'video' },
    lipsync: { label: 'Lip Sync', historyKey: 'lipsync_history', page: 'lipsync' },
    cinema: { label: 'Cinema', historyKey: 'cinema_history', page: 'cinema' },
};
const CHECK_EVERY_MS = 10000;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isVideo = (kind, url) => kind === 'video' || kind === 'lipsync' || /\.(mp4|webm|mov)(\?|$)/i.test(url || '');

function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

/** Every finished generation across the studios, newest first. Cinema entries keep their prompt under `settings`. */
function finishedProjects() {
    return Object.entries(STUDIOS)
        .flatMap(([kind, s]) => readJson(s.historyKey).map(e => ({
            id: e.id || e.url,
            kind,
            url: e.url,
            prompt: e.prompt ?? e.settings?.prompt ?? '',
            model: e.model || '',
            at: new Date(e.timestamp).getTime() || 0,
        })))
        .filter(p => p.url)
        .sort((a, b) => b.at - a.at);
}

function ago(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ProjectsPage() {
    const page = document.createElement('div');
    page.className = 'w-full h-full overflow-y-auto custom-scrollbar bg-app-bg px-4 md:px-8 py-8';
    page.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-10">
            <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-black text-white tracking-tight">Projects</h1>
                    <p class="text-sm text-secondary mt-1">What's still generating, and everything that's finished. Saved in this browser.</p>
                </div>
                <div id="projects-filters" class="flex flex-wrap gap-2"></div>
            </div>
            <section aria-labelledby="ongoing-title">
                <h2 id="ongoing-title" class="text-sm font-black uppercase tracking-widest text-secondary mb-3">In progress <span id="ongoing-count" class="text-muted"></span></h2>
                <div id="ongoing-list" class="grid gap-3 grid-cols-1 md:grid-cols-2"></div>
            </section>
            <section aria-labelledby="done-title">
                <h2 id="done-title" class="text-sm font-black uppercase tracking-widest text-secondary mb-3">Done <span id="done-count" class="text-muted"></span></h2>
                <div id="done-grid" class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"></div>
            </section>
        </div>
    `;

    const filters = page.querySelector('#projects-filters');
    const ongoingList = page.querySelector('#ongoing-list');
    const doneGrid = page.querySelector('#done-grid');
    let filter = 'all';
    // Latest kie.ai answer per running job: { state: 'running' | 'success' | 'failed', url, error }.
    const status = new Map();

    const open = (kind) => window.dispatchEvent(new CustomEvent('navigate', { detail: { page: STUDIOS[kind].page } }));
    const badge = (kind) => `<span class="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-primary/15 text-white">${esc(STUDIOS[kind].label)}</span>`;
    const preview = (kind, url, cls) => isVideo(kind, url)
        ? `<video src="${esc(url)}" class="${cls}" muted playsinline preload="metadata"></video>`
        : `<img src="${esc(url)}" alt="" class="${cls}" loading="lazy">`;
    const empty = (text) => `<div class="col-span-full rounded-2xl border border-dashed border-white/10 bg-panel-bg/50 px-6 py-8 text-center text-sm text-secondary">${text}</div>`;

    function render() {
        const done = finishedProjects();
        const doneIds = new Set(done.map(p => p.id));
        // A job a studio already collected shows up once, under Done.
        const ongoing = getPendingJobs()
            .filter(j => STUDIOS[j.studioType] && !doneIds.has(j.requestId))
            .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
        const show = (kind) => filter === 'all' || kind === filter;
        const ongoingShown = ongoing.filter(j => show(j.studioType));
        const doneShown = done.filter(p => show(p.kind));

        page.querySelector('#ongoing-count').textContent = `(${ongoingShown.length})`;
        page.querySelector('#done-count').textContent = `(${doneShown.length})`;

        ongoingList.innerHTML = ongoingShown.length ? '' : empty('Nothing is generating right now. Start something in Image, Video or Lip Sync and it shows up here.');
        ongoingShown.forEach(job => {
            const st = status.get(job.requestId) || { state: 'running' };
            const label = STUDIOS[job.studioType].label;
            const card = document.createElement('div');
            card.className = 'flex gap-4 p-4 rounded-2xl border border-white/10 bg-panel-bg';
            const state = st.state === 'success'
                ? `<span class="text-[10px] font-black uppercase tracking-widest text-green-400">Ready</span>`
                : st.state === 'failed'
                    ? `<span class="text-[10px] font-black uppercase tracking-widest text-red-400">Failed</span>`
                    : `<span class="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></span>Generating</span>`;
            card.innerHTML = `
                <div class="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                    ${st.state === 'success' && st.url ? preview(job.studioType, st.url, 'w-full h-full object-cover') : (st.state === 'failed' ? '<span class="text-2xl font-black text-red-400">!</span>' : '<span class="w-7 h-7 rounded-full border-[3px] border-primary/25 border-t-primary animate-spin"></span>')}
                </div>
                <div class="min-w-0 flex-1 flex flex-col gap-1.5">
                    <div class="flex items-center justify-between gap-2">${badge(job.studioType)}${state}</div>
                    <p class="text-sm text-white line-clamp-2">${esc(job.historyMeta?.prompt) || '<span class="text-muted">No prompt</span>'}</p>
                    <p class="text-[11px] text-muted">${esc(job.historyMeta?.model || '')}${job.historyMeta?.model ? ' · ' : ''}started ${ago(job.submittedAt || Date.now())}</p>
                    ${st.state === 'failed' ? `<p class="text-[11px] text-red-300">${esc(st.error)}</p>` : ''}
                    <div class="mt-auto pt-1">
                        <button type="button" data-open class="text-[11px] font-bold text-primary hover:text-white transition-colors">${st.state === 'success' ? `Open ${esc(label)} to save it →` : `Open ${esc(label)} →`}</button>
                    </div>
                </div>`;
            card.querySelector('[data-open]').onclick = () => open(job.studioType);
            ongoingList.appendChild(card);
        });

        doneGrid.innerHTML = doneShown.length ? '' : empty('Finished images and videos appear here.');
        doneShown.forEach(p => {
            const card = document.createElement('div');
            card.className = 'group rounded-2xl border border-white/10 bg-panel-bg overflow-hidden flex flex-col hover:border-white/30 transition-colors';
            card.innerHTML = `
                <a href="${esc(p.url)}" target="_blank" rel="noopener" class="block aspect-video bg-black/40 overflow-hidden" title="Open full size">
                    ${preview(p.kind, p.url, 'w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300')}
                </a>
                <div class="p-3.5 flex flex-col gap-1.5">
                    <div class="flex items-center justify-between gap-2">${badge(p.kind)}<span class="text-[10px] font-black uppercase tracking-widest text-green-400">Done</span></div>
                    <p class="text-sm text-white line-clamp-2">${esc(p.prompt) || '<span class="text-muted">No prompt</span>'}</p>
                    <div class="flex items-center justify-between gap-2 text-[11px] text-muted">
                        <span class="truncate">${esc(p.model)}${p.model && p.at ? ' · ' : ''}${p.at ? ago(p.at) : ''}</span>
                        <a href="${esc(p.url)}" target="_blank" rel="noopener" download class="font-bold text-primary hover:text-white shrink-0">Download</a>
                    </div>
                </div>`;
            doneGrid.appendChild(card);
        });
    }

    // Ask kie.ai about each running job (one request each, no waiting). Read-only: the studio that started
    // a job still saves it to its history, so nothing here can overwrite a studio's list.
    let checking = false;
    async function checkRunning() {
        if (checking || !page.isConnected) return;
        const key = localStorage.getItem('kie_key');
        const jobs = getPendingJobs().filter(j => STUDIOS[j.studioType] && status.get(j.requestId)?.state !== 'success' && status.get(j.requestId)?.state !== 'failed');
        if (!key || !jobs.length) return;
        checking = true;
        try {
            const { kie } = await import('../lib/kie.js');
            await Promise.all(jobs.map(async (j) => {
                try { status.set(j.requestId, await kie.checkTask(j.requestId, key)); } catch { /* keep the last known state */ }
            }));
        } finally {
            checking = false;
        }
        if (page.isConnected) render();
    }

    [['all', 'All'], ...Object.entries(STUDIOS).map(([k, s]) => [k, s.label])].forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.dataset.key = key;
        b.onclick = () => { filter = key; paintFilters(); render(); };
        filters.appendChild(b);
    });
    function paintFilters() {
        filters.querySelectorAll('button').forEach(b => {
            const on = b.dataset.key === filter;
            b.setAttribute('aria-pressed', String(on));
            b.className = on
                ? 'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-white shadow-glow transition-all'
                : 'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-white/5 text-secondary hover:text-white hover:bg-white/10 transition-all';
        });
    }

    paintFilters();
    render();
    // The page is attached right after this returns; check once it is on screen.
    setTimeout(checkRunning, 0);
    // Refresh while the page is open: picks up jobs started or finished in another tab, and keeps "started … ago" current.
    const timer = setInterval(() => {
        if (!page.isConnected) return clearInterval(timer);
        render();
        checkRunning();
    }, CHECK_EVERY_MS);
    return page;
}
