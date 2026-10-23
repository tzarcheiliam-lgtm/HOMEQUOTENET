import { getCatalog } from '../lib/catalog.js';
import { finishedProjects, STUDIOS } from '../lib/creations.js';
import { infoFor } from '../lib/modelInfo.js';
import { PRESETS } from '../lib/presets.js';
import { go, href } from '../lib/router.js';
import { SAMPLES } from '../lib/samples.js';
import { MASONRY, esc, mediaHtml, openViewer, placeholderHtml, wireHoverPlay } from './media.js';

const STUDIO_LABEL = { image: 'Image', video: 'Video', lipsync: 'Lip Sync', cinema: 'Cinema' };
const SHAPES = ['aspect-[4/5]', 'aspect-video', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/3]'];

export function ExplorePage() {
    const page = document.createElement('div');
    page.className = 'w-full h-full overflow-y-auto custom-scrollbar bg-app-bg';

    const mine = finishedProjects();
    const catalog = getCatalog().filter((m) => m.runsAs);
    // One entry per model kie.ai actually runs (several Seret ids share one).
    const models = [...new Map(catalog.map((m) => [m.runsAs, m])).values()];

    page.innerHTML = `
        <section class="relative px-4 md:px-8 pt-10 md:pt-16 pb-10 overflow-hidden">
            <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(70% 60% at 50% 0%, rgba(47,107,255,.28), transparent 70%)"></div>
            <div class="relative max-w-3xl mx-auto text-center">
                <p class="text-[11px] font-black uppercase tracking-[0.25em] text-gold mb-4">Seret · AI studio for home-service ads</p>
                <h1 class="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.05]">What do you want to make?</h1>
                <p class="text-secondary mt-4 text-sm md:text-base">Photos and videos of remodels, pools, roofs and more, ready for ads in minutes.</p>
                <form data-hero class="mt-8 text-left bg-panel-bg/90 border border-white/10 rounded-3xl p-3 md:p-4 shadow-3xl backdrop-blur-xl">
                    <textarea name="prompt" rows="2" placeholder="A drone flyover of a new backyard pool at sunset…" class="w-full bg-transparent resize-none outline-none text-white placeholder:text-muted text-base md:text-lg px-2 py-1"></textarea>
                    <div class="flex items-center justify-between gap-3 mt-2">
                        <div class="flex p-1 rounded-2xl bg-white/5 border border-white/10" role="group" aria-label="What to make">
                            <button type="button" data-kind="image" class="px-4 py-2 rounded-xl text-xs font-bold">Image</button>
                            <button type="button" data-kind="video" class="px-4 py-2 rounded-xl text-xs font-bold">Video</button>
                        </div>
                        <button type="submit" class="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-glow transition-colors">Create ✦</button>
                    </div>
                </form>
            </div>
        </section>

        <section class="px-4 md:px-8 pb-10">
            <div class="max-w-7xl mx-auto">
                <div class="flex items-end justify-between mb-4">
                    <h2 class="text-xl md:text-2xl font-bold text-white">Start from a preset</h2>
                    <span class="text-xs text-muted hidden sm:block">One click fills in the prompt and model</span>
                </div>
                <div data-presets class="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-2 -mx-4 px-4 md:mx-0 md:px-0"></div>
            </div>
        </section>

        <section data-mine-section class="px-4 md:px-8 pb-10 ${mine.length ? '' : 'hidden'}">
            <div class="max-w-7xl mx-auto">
                <div class="flex items-end justify-between mb-4">
                    <h2 class="text-xl md:text-2xl font-bold text-white">Your recent creations</h2>
                    <a href="${href('projects')}" class="text-xs font-bold text-primary hover:text-white">All projects →</a>
                </div>
                <div data-mine class="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-2 -mx-4 px-4 md:mx-0 md:px-0"></div>
            </div>
        </section>

        <section class="px-4 md:px-8 pb-16">
            <div class="max-w-7xl mx-auto">
                <div class="flex items-end justify-between mb-4">
                    <h2 class="text-xl md:text-2xl font-bold text-white">Made with Seret</h2>
                    <a href="${href('models')}" class="text-xs font-bold text-primary hover:text-white">Browse models →</a>
                </div>
                <div data-feed class="${MASONRY}"></div>
            </div>
        </section>`;

    // Hero prompt: Image / Video switch, then open that studio with the prompt filled in.
    let kind = 'image';
    const form = page.querySelector('[data-hero]');
    const paint = () => form.querySelectorAll('[data-kind]').forEach((b) => {
        const on = b.dataset.kind === kind;
        b.setAttribute('aria-pressed', String(on));
        b.className = `px-4 py-2 rounded-xl text-xs font-bold transition-colors ${on ? 'bg-primary text-white' : 'text-secondary hover:text-white'}`;
    });
    form.querySelectorAll('[data-kind]').forEach((b) => (b.onclick = () => { kind = b.dataset.kind; paint(); }));
    paint();
    form.onsubmit = (e) => {
        e.preventDefault();
        go(kind, { prompt: form.prompt.value.trim() });
    };
    form.prompt.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });

    // Presets
    const presetRow = page.querySelector('[data-presets]');
    PRESETS.forEach((p) => {
        const cover = SAMPLES.byPreset[p.id]?.[0];
        const a = document.createElement('a');
        a.href = href(p.page, { prompt: p.prompt, model: p.model, aspect_ratio: p.aspect_ratio });
        a.dataset.card = '1';
        a.className = 'group snap-start shrink-0 w-44 md:w-56 rounded-2xl overflow-hidden border border-white/10 bg-panel-bg hover:border-primary/60 hover:-translate-y-0.5 transition-all';
        a.innerHTML = `
            <div class="relative aspect-[4/5] overflow-hidden">
                ${cover ? mediaHtml(cover, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500') : placeholderHtml(p.title, p.page === 'lipsync' ? 'lipsync' : p.page)}
                <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent"></div>
                <div class="absolute inset-x-0 bottom-0 p-3">
                    <span class="text-[9px] font-black uppercase tracking-widest text-gold">${esc(STUDIO_LABEL[p.page])}</span>
                    <p class="text-sm font-bold text-white leading-snug">${esc(p.title)}</p>
                </div>
            </div>`;
        presetRow.appendChild(a);
    });

    // Your recent creations
    const mineRow = page.querySelector('[data-mine]');
    mine.slice(0, 10).forEach((p) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.card = '1';
        b.className = 'group snap-start shrink-0 w-40 md:w-48 aspect-square rounded-2xl overflow-hidden border border-white/10 bg-panel-bg hover:border-white/30 transition-colors';
        b.innerHTML = mediaHtml(p, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500');
        b.onclick = () => openViewer({ ...p, label: STUDIOS[p.kind].label, title: p.model || STUDIOS[p.kind].label });
        mineRow.appendChild(b);
    });

    // Feed: real samples first; until the sample generator has run, featured models as placeholder tiles.
    const feed = page.querySelector('[data-feed]');
    const sampleItems = [
        ...SAMPLES.feed,
        ...Object.entries(SAMPLES.byModel).flatMap(([runsAs, list]) => list.map((s) => ({ ...s, runsAs }))),
    ];
    if (sampleItems.length) {
        sampleItems.forEach((s) => {
            const model = models.find((m) => m.runsAs === s.runsAs);
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.card = '1';
            b.className = 'group relative block w-full rounded-2xl overflow-hidden border border-white/10 bg-panel-bg hover:border-white/30 transition-colors text-left';
            b.innerHTML = `${mediaHtml(s, 'w-full h-auto block group-hover:scale-[1.02] transition-transform duration-500')}
                <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p class="text-xs text-white line-clamp-2">${esc(s.prompt)}</p>
                    ${s.runsAs ? `<p class="text-[10px] font-bold text-gold mt-1">${esc(s.runsAs)}</p>` : ''}
                </div>`;
            b.onclick = () => openViewer({ ...s, label: 'Sample', title: s.runsAs || 'Sample', page: s.type === 'video' ? 'video' : 'image', modelId: model?.id });
            feed.appendChild(b);
        });
    } else {
        models.forEach((m, i) => {
            const info = infoFor(m.runsAs);
            const a = document.createElement('a');
            a.href = href('models', {}, m.id);
            a.dataset.card = '1';
            a.className = `group relative block w-full ${SHAPES[i % SHAPES.length]} rounded-2xl overflow-hidden border border-white/10 hover:border-primary/60 transition-colors`;
            a.innerHTML = `${placeholderHtml(m.runsAs, m.kind)}
                <div class="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                    <span class="text-[9px] font-black uppercase tracking-widest text-gold">${esc(info?.maker || '')}${info?.maker ? ' · ' : ''}${m.kind}</span>
                    <p class="text-sm font-bold text-white">${esc(m.runsAs)}</p>
                    ${info?.tagline ? `<p class="text-[11px] text-secondary line-clamp-2 mt-0.5">${esc(info.tagline)}</p>` : ''}
                </div>`;
            feed.appendChild(a);
        });
    }
    wireHoverPlay(page);
    return page;
}
