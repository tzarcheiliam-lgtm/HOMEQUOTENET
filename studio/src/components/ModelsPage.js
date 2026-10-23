import { getCatalog, getPreferredId, setPreferredModel } from '../lib/catalog.js';

const PRICING_URL = 'https://kie.ai/pricing';

export function ModelsPage() {
    const page = document.createElement('div');
    page.className = 'w-full h-full overflow-y-auto custom-scrollbar bg-app-bg px-4 md:px-8 py-8';

    const catalog = getCatalog();
    let filter = 'all';

    page.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                <div>
                    <h1 class="text-2xl font-black text-white tracking-tight">Models</h1>
                    <p class="text-sm text-secondary mt-1">Pick the model each studio starts with. Greyed-out models aren't on kie.ai.</p>
                </div>
                <div id="models-filters" class="flex gap-2"></div>
            </div>
            <div id="models-grid" class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"></div>
        </div>
    `;

    const filters = page.querySelector('#models-filters');
    const grid = page.querySelector('#models-grid');
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function renderGrid() {
        const selected = { image: getPreferredId('image') || catalog.find(m => m.kind === 'image').id, video: getPreferredId('video') || catalog.find(m => m.kind === 'video').id };
        const items = catalog
            .filter(m => filter === 'all' || m.kind === filter)
            .sort((a, b) => Number(!!b.runsAs) - Number(!!a.runsAs));
        grid.innerHTML = '';
        items.forEach(m => {
            const available = !!m.runsAs;
            const isSelected = available && selected[m.kind] === m.id;
            const card = document.createElement(available ? 'button' : 'div');
            card.className = `text-left p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                isSelected ? 'border-primary bg-primary/10 shadow-glow'
                : available ? 'border-white/10 bg-panel-bg hover:border-white/30 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'
                : 'border-white/5 bg-white/[0.02] opacity-50'}`;
            if (available) {
                card.type = 'button';
                card.setAttribute('aria-pressed', String(isSelected));
            }
            card.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <span class="font-bold text-white text-sm">${esc(m.name)}</span>
                    <span class="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${m.kind === 'video' ? 'bg-white/10 text-white' : 'bg-white/5 text-secondary'}">${m.kind}</span>
                </div>
                <div class="text-xs text-secondary">${available ? `Runs on kie.ai as <span class="text-white">${esc(m.runsAs)}</span>` : esc(m.reason)}</div>
                <div class="flex items-center justify-between mt-auto pt-1">
                    <span class="text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-primary' : available ? 'text-green-400' : 'text-muted'}">${isSelected ? '✓ Selected' : available ? 'Available' : 'Unavailable'}</span>
                    ${available ? `<a href="${PRICING_URL}" target="_blank" rel="noopener" class="text-[10px] font-bold text-muted hover:text-white" data-price>Price →</a>` : ''}
                </div>
            `;
            if (available) {
                card.onclick = (e) => {
                    if (e.target.closest('[data-price]')) return;
                    setPreferredModel(m.kind, m.id);
                    renderGrid();
                };
            }
            grid.appendChild(card);
        });
    }

    [['all', 'All'], ['image', 'Image'], ['video', 'Video']].forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.dataset.key = key;
        b.onclick = () => { filter = key; paintFilters(); renderGrid(); };
        filters.appendChild(b);
    });
    function paintFilters() {
        filters.querySelectorAll('button').forEach(b => {
            b.className = b.dataset.key === filter
                ? 'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-white shadow-glow transition-all'
                : 'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-white/5 text-secondary hover:text-white hover:bg-white/10 transition-all';
        });
    }
    paintFilters();
    renderGrid();
    return page;
}
