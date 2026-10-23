import { getCatalog, getPreferredId, setPreferredModel } from '../lib/catalog.js';
import { infoFor } from '../lib/modelInfo.js';
import { go, href } from '../lib/router.js';
import { SAMPLES } from '../lib/samples.js';
import { chipsFor } from '../lib/specs.js';
import { esc, mediaHtml, placeholderHtml, wireHoverPlay } from './media.js';

const TYPES = [['all', 'All'], ['image', 'Image'], ['video', 'Video']];
const CAPS = [
    ['vertical', 'Vertical 9:16', (c) => c.some((x) => x === 'Vertical 9:16')],
    ['hd', '1080p / 4K', (c) => c.some((x) => /1080|4K/i.test(x))],
    ['long', '10s+', (c) => c.some((x) => /up to (\d+)s/.test(x) && Number(x.match(/(\d+)s/)[1]) >= 10)],
];

export function ModelsPage() {
    const page = document.createElement('div');
    page.className = 'w-full h-full overflow-y-auto custom-scrollbar bg-app-bg px-4 md:px-8 py-8';

    const catalog = getCatalog().map((m) => ({ ...m, info: infoFor(m.runsAs), chips: m.runsAs ? chipsFor(m) : [] }));
    let type = 'all', query = '', caps = new Set(), showAll = false;

    page.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                <div>
                    <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight">Models</h1>
                    <p class="text-sm text-secondary mt-2 max-w-xl">Every model Seret can run, with what it's good at. Pick one to see samples and full specs.</p>
                </div>
                <input data-search type="search" placeholder="Search models or makers…" class="w-full lg:w-72 bg-panel-bg border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-primary/60">
            </div>
            <div class="flex flex-wrap items-center gap-2 mb-6">
                <div data-types class="flex gap-2"></div>
                <span class="w-px h-6 bg-white/10 mx-1 hidden sm:block"></span>
                <div data-caps class="flex flex-wrap gap-2"></div>
                <label class="ml-auto flex items-center gap-2 text-xs text-secondary cursor-pointer select-none">
                    <input data-all type="checkbox" class="accent-[#2f6bff]"> Show models not on kie.ai
                </label>
            </div>
            <div data-grid class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"></div>
        </div>`;

    const grid = page.querySelector('[data-grid]');
    const chip = (on) => `px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${on ? 'bg-primary text-white shadow-glow' : 'bg-white/5 text-secondary hover:text-white hover:bg-white/10'}`;

    function renderControls() {
        const t = page.querySelector('[data-types]');
        t.innerHTML = '';
        TYPES.forEach(([k, label]) => {
            const b = document.createElement('button');
            b.type = 'button'; b.textContent = label; b.className = chip(type === k);
            b.setAttribute('aria-pressed', String(type === k));
            b.onclick = () => { type = k; renderControls(); renderGrid(); };
            t.appendChild(b);
        });
        const c = page.querySelector('[data-caps]');
        c.innerHTML = '';
        CAPS.forEach(([k, label]) => {
            const on = caps.has(k);
            const b = document.createElement('button');
            b.type = 'button'; b.textContent = label;
            b.className = `px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${on ? 'border-gold/70 text-white bg-gold/10' : 'border-white/10 text-secondary hover:text-white'}`;
            b.setAttribute('aria-pressed', String(on));
            b.onclick = () => { on ? caps.delete(k) : caps.add(k); renderControls(); renderGrid(); };
            c.appendChild(b);
        });
    }

    function renderGrid() {
        const selected = { image: getPreferredId('image'), video: getPreferredId('video') };
        const q = query.toLowerCase();
        const list = catalog
            .filter((m) => showAll || m.runsAs)
            .filter((m) => type === 'all' || m.kind === type)
            .filter((m) => !q || [m.name, m.runsAs, m.info?.maker, m.info?.tagline].some((s) => s && s.toLowerCase().includes(q)))
            .filter((m) => [...caps].every((k) => CAPS.find((x) => x[0] === k)[2](m.chips)))
            // Models with real details first, then available, then the rest; alphabetical within.
            .sort((a, b) => (Number(!!b.info) - Number(!!a.info)) || (Number(!!b.runsAs) - Number(!!a.runsAs)) || a.name.localeCompare(b.name));

        grid.innerHTML = list.length ? '' : '<p class="col-span-full text-sm text-secondary py-10 text-center">No models match. Try clearing a filter.</p>';
        list.forEach((m) => {
            const sample = m.runsAs && SAMPLES.byModel[m.runsAs]?.[0];
            const isSel = m.runsAs && selected[m.kind] === m.id;
            const card = document.createElement('div');
            card.dataset.card = '1';
            card.className = `group relative rounded-3xl overflow-hidden border bg-panel-bg flex flex-col transition-all ${m.runsAs ? 'hover:-translate-y-0.5 hover:border-primary/60' : 'opacity-50'} ${isSel ? 'border-primary shadow-glow' : 'border-white/10'}`;
            card.innerHTML = `
                <a href="${href('models', {}, m.id)}" class="relative block aspect-[16/11] overflow-hidden" aria-label="${esc(m.name)} details">
                    ${sample ? mediaHtml(sample, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500') : placeholderHtml(m.runsAs || m.name, m.kind)}
                    <span class="absolute left-3 top-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-black/60 backdrop-blur text-white">${m.kind === 'image' ? 'Text → Image' : 'Text → Video'}</span>
                    ${isSel ? '<span class="absolute right-3 top-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-primary text-white">Your default</span>' : ''}
                </a>
                <div class="p-4 flex flex-col gap-2 flex-1">
                    <div>
                        <p class="text-[10px] font-black uppercase tracking-widest text-gold">${esc(m.info?.maker || (m.runsAs ? 'kie.ai' : 'Unavailable'))}</p>
                        <h3 class="text-base font-bold text-white leading-snug">${esc(m.name)}</h3>
                        <p class="text-xs text-secondary mt-1 line-clamp-2">${esc(m.info?.tagline || (m.runsAs ? '' : m.reason))}</p>
                    </div>
                    ${m.chips.length ? `<div class="flex flex-wrap gap-1.5">${m.chips.map((c) => `<span class="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-secondary">${esc(c)}</span>`).join('')}</div>` : ''}
                    <div class="mt-auto pt-2 flex items-center justify-between gap-2">
                        <span class="text-[11px] text-muted truncate">${m.runsAs ? (m.info?.price ? esc(m.info.price.text) : `Runs as ${esc(m.runsAs)}`) : ''}</span>
                        ${m.runsAs ? `<button type="button" data-use class="shrink-0 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[11px] font-bold transition-colors">Use model</button>` : ''}
                    </div>
                </div>`;
            card.querySelector('[data-use]')?.addEventListener('click', () => {
                setPreferredModel(m.kind, m.id);
                go(m.kind, { model: m.id });
            });
            grid.appendChild(card);
        });
        wireHoverPlay(grid);
    }

    page.querySelector('[data-search]').addEventListener('input', (e) => { query = e.target.value; renderGrid(); });
    page.querySelector('[data-all]').addEventListener('change', (e) => { showAll = e.target.checked; renderGrid(); });
    renderControls();
    renderGrid();
    return page;
}
