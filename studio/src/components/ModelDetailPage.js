import { getCatalog, getPreferredId, setPreferredModel } from '../lib/catalog.js';
import { PRICING_URL, infoFor } from '../lib/modelInfo.js';
import { PRESETS } from '../lib/presets.js';
import { go, href } from '../lib/router.js';
import { SAMPLES } from '../lib/samples.js';
import { specsFor } from '../lib/specs.js';
import { esc, mediaHtml, openViewer, placeholderHtml, wireHoverPlay } from './media.js';

export function ModelDetailPage(id) {
    const page = document.createElement('div');
    page.className = 'w-full h-full overflow-y-auto custom-scrollbar bg-app-bg';
    const catalog = getCatalog();
    const m = catalog.find((x) => x.id === id);

    if (!m) {
        page.innerHTML = `<div class="max-w-xl mx-auto text-center py-24 px-4">
            <h1 class="text-2xl font-bold text-white">Model not found</h1>
            <p class="text-secondary mt-2 text-sm">It may have been renamed or removed.</p>
            <a href="${href('models')}" class="inline-block mt-6 px-5 py-3 rounded-2xl bg-primary text-white text-sm font-bold">All models</a></div>`;
        return page;
    }

    const info = infoFor(m.runsAs);
    const spec = specsFor(m);
    const samples = (m.runsAs && SAMPLES.byModel[m.runsAs]) || [];
    const siblings = catalog.filter((x) => x.runsAs && x.runsAs === m.runsAs && x.id !== m.id);
    const examples = spec.examples.length ? spec.examples.slice(0, 4) : PRESETS.filter((p) => p.page === m.kind).map((p) => p.prompt).slice(0, 3);
    const isDefault = getPreferredId(m.kind) === m.id;
    const studio = m.kind === 'image' ? 'Image Studio' : 'Video Studio';
    const row = (label, values, unit = '') => values.length
        ? `<div class="grid grid-cols-[130px_1fr] gap-3 py-3 border-b border-white/5 last:border-0">
            <dt class="text-xs text-muted">${label}</dt>
            <dd class="flex flex-wrap gap-1.5">${values.map((v) => `<span class="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white">${esc(v)}${unit}</span>`).join('')}</dd>
          </div>` : '';
    const specRows = [
        row('Aspect ratios', spec.aspect),
        row('Resolutions', spec.res.map((r) => String(r).toUpperCase().replace('P', 'p'))),
        row('Durations', spec.dur, 's'),
        row('Quality', spec.quality),
        row('Settings', spec.settings),
    ].join('');

    page.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
            <a href="${href('models')}" class="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-white mb-5">← All models</a>
            <div class="grid lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-10">
                <div>
                    <div data-gallery class="grid gap-3 ${samples.length > 1 ? 'grid-cols-2' : ''}"></div>
                    ${samples.length ? '' : `<p class="text-xs text-muted mt-3">Sample outputs appear here once the sample generator has been run.</p>`}
                </div>
                <div class="flex flex-col gap-5">
                    <div>
                        <p class="text-[11px] font-black uppercase tracking-widest text-gold">${esc(info?.maker || 'kie.ai')} · ${m.kind === 'image' ? 'Text → Image' : 'Text → Video'}</p>
                        <h1 class="text-3xl md:text-4xl font-bold text-white tracking-tight mt-1">${esc(m.name)}</h1>
                        ${info?.tagline ? `<p class="text-base text-secondary mt-2">${esc(info.tagline)}</p>` : ''}
                    </div>
                    ${m.runsAs ? `
                        <div class="rounded-2xl border border-white/10 bg-panel-bg p-4 text-sm">
                            <p class="text-white">Runs on kie.ai as <span class="font-bold">${esc(m.runsAs)}</span>.</p>
                            ${m.runsAs !== m.name ? `<p class="text-xs text-secondary mt-1">Seret lists this as “${esc(m.name)}”, but kie.ai generates it with ${esc(m.runsAs)}. Results and price follow ${esc(m.runsAs)}.</p>` : ''}
                            <p class="text-xs mt-2 ${info?.price ? 'text-white' : 'text-muted'}">${info?.price
                                ? `≈ ${esc(info.price.text)} <a href="${esc(info.price.source)}" target="_blank" rel="noopener" class="text-primary hover:text-white">(kie.ai, checked ${esc(info.price.checked)})</a>`
                                : `Price: see <a href="${PRICING_URL}" target="_blank" rel="noopener" class="text-primary hover:text-white">kie.ai pricing</a>`}</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" data-open class="flex-1 min-w-[200px] px-5 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-glow transition-colors">Open in ${studio} ✦</button>
                            <button type="button" data-default class="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors" ${isDefault ? 'disabled' : ''}>${isDefault ? '✓ Your default' : 'Make default'}</button>
                        </div>`
                    : `<div class="rounded-2xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">${esc(m.reason || 'Not offered on kie.ai')}. Seret can't run this model yet.</div>`}
                    ${info?.description ? `<p class="text-sm text-secondary leading-relaxed">${esc(info.description)}</p>` : ''}
                    ${info?.bestFor?.length ? `<div><p class="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Best for</p><div class="flex flex-wrap gap-1.5">${info.bestFor.map((b) => `<span class="text-xs px-3 py-1.5 rounded-xl bg-gold/10 border border-gold/30 text-white">${esc(b)}</span>`).join('')}</div></div>` : ''}
                    ${specRows ? `<div><p class="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Specs</p><dl>${specRows}</dl></div>` : ''}
                </div>
            </div>

            ${m.runsAs && examples.length ? `
            <section class="mt-10">
                <h2 class="text-xl font-bold text-white mb-3">Try a prompt</h2>
                <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    ${examples.map((e, i) => `<button type="button" data-example="${i}" class="text-left p-4 rounded-2xl border border-white/10 bg-panel-bg hover:border-primary/60 transition-colors"><p class="text-sm text-secondary line-clamp-4">${esc(e)}</p><p class="text-[11px] font-bold text-primary mt-3">Use this prompt →</p></button>`).join('')}
                </div>
            </section>` : ''}

            ${siblings.length ? `
            <section class="mt-10">
                <h2 class="text-xl font-bold text-white mb-1">Also runs as ${esc(m.runsAs)}</h2>
                <p class="text-xs text-muted mb-3">These names all generate with the same kie.ai model.</p>
                <div class="flex flex-wrap gap-2">${siblings.map((s) => `<a href="${href('models', {}, s.id)}" class="text-xs font-bold px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-secondary hover:text-white">${esc(s.name)}</a>`).join('')}</div>
            </section>` : ''}
        </div>`;

    const gallery = page.querySelector('[data-gallery]');
    if (samples.length) {
        samples.forEach((s, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.card = '1';
            b.className = `group rounded-3xl overflow-hidden border border-white/10 bg-black/40 ${i === 0 && samples.length > 2 ? 'col-span-2' : ''}`;
            b.innerHTML = mediaHtml(s, 'w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500');
            b.onclick = () => openViewer({ ...s, title: m.name, label: 'Sample', page: m.kind, modelId: m.id });
            gallery.appendChild(b);
        });
    } else {
        gallery.innerHTML = `<div class="aspect-[16/10] rounded-3xl overflow-hidden border border-white/10">${placeholderHtml(m.runsAs || m.name, m.kind)}</div>`;
    }

    const open = (prompt) => { setPreferredModel(m.kind, m.id); go(m.kind, { model: m.id, prompt }); };
    page.querySelector('[data-open]')?.addEventListener('click', () => open());
    page.querySelector('[data-default]')?.addEventListener('click', (e) => {
        setPreferredModel(m.kind, m.id);
        e.currentTarget.textContent = '✓ Your default';
        e.currentTarget.disabled = true;
    });
    page.querySelectorAll('[data-example]').forEach((b) => b.addEventListener('click', () => open(examples[Number(b.dataset.example)])));
    wireHoverPlay(page);
    return page;
}
