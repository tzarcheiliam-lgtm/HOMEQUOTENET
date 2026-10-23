import { href } from '../lib/router.js';

// Shared pieces for media-first pages: escaping, previews, branded placeholders and the full-screen viewer.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function ago(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TYPE_ICON = {
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    video: '<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3z"/>',
    lipsync: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
};

/** Stand-in artwork until real samples exist: navy gradient, initials and a type icon. */
export function placeholderHtml(title, type = 'image', cls = '') {
    const initials = String(title || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    // Vary the gradient angle and glow per title so a grid of placeholders isn't uniform.
    const h = [...String(title)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const angle = h % 360, x = 20 + (h % 60), y = 15 + ((h >> 3) % 60);
    return `<div class="relative w-full h-full overflow-hidden ${cls}" style="background:
            radial-gradient(120% 90% at ${x}% ${y}%, rgba(47,107,255,.45), transparent 60%),
            linear-gradient(${angle}deg, #0a1b3d, #06132e 55%, #102552)">
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TYPE_ICON[type] || TYPE_ICON.image}</svg>
            <span class="font-display text-2xl font-bold tracking-tight">${esc(initials)}</span>
        </div>
        <div class="absolute right-3 top-3 w-1.5 h-1.5 rounded-full bg-gold/80"></div>
    </div>`;
}

/** <img> or a muted looping <video> that plays while hovered (tap toggles on touch screens). */
export function mediaHtml(item, cls = 'w-full h-full object-cover') {
    if (!item?.url) return placeholderHtml(item?.title || item?.model || 'Seret', item?.type);
    if (item.type === 'video') {
        return `<video src="${esc(item.url)}" ${item.poster ? `poster="${esc(item.poster)}"` : ''} class="${cls}" muted loop playsinline preload="metadata" data-hover-play></video>`;
    }
    return `<img src="${esc(item.url)}" alt="${esc(item.prompt || item.title || '')}" class="${cls}" loading="lazy" decoding="async">`;
}

/** Wire hover-to-play for every [data-hover-play] video under root. */
export function wireHoverPlay(root) {
    root.querySelectorAll('video[data-hover-play]').forEach((v) => {
        const card = v.closest('[data-card]') || v;
        card.addEventListener('mouseenter', () => v.play().catch(() => {}));
        card.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
    });
}

/** Link that loads an item's prompt, model and settings back into its studio. */
export function recreateHref(item) {
    const page = item.page || (item.type === 'video' ? 'video' : 'image');
    return href(page, { prompt: item.prompt, model: item.modelId || item.model, aspect_ratio: item.settings?.aspect_ratio });
}

/** Full-screen viewer: big media, prompt, model and settings, with Recreate and Download. */
export function openViewer(item) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-8 animate-fade-in-up';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const settings = Object.entries(item.settings || {}).filter(([k, v]) => v !== undefined && v !== '' && k !== 'prompt' && typeof v !== 'object');
    overlay.innerHTML = `
        <div class="w-full max-w-6xl max-h-full grid md:grid-cols-[1fr_320px] gap-4 md:gap-6 bg-panel-bg border border-white/10 rounded-3xl overflow-hidden shadow-3xl">
            <div class="bg-black/50 flex items-center justify-center min-h-[240px] max-h-[70vh] md:max-h-[85vh]">
                ${item.url
                    ? item.type === 'video'
                        ? `<video src="${esc(item.url)}" class="max-w-full max-h-[70vh] md:max-h-[85vh]" controls autoplay loop playsinline></video>`
                        : `<img src="${esc(item.url)}" alt="" class="max-w-full max-h-[70vh] md:max-h-[85vh] object-contain">`
                    : `<div class="w-full aspect-video">${placeholderHtml(item.title || item.model, item.type)}</div>`}
            </div>
            <div class="p-5 md:p-6 md:pl-0 flex flex-col gap-4 overflow-y-auto">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        ${item.label ? `<span class="text-[10px] font-black uppercase tracking-widest text-gold">${esc(item.label)}</span>` : ''}
                        <h2 class="text-lg font-bold text-white leading-snug">${esc(item.title || item.modelName || item.model || 'Creation')}</h2>
                    </div>
                    <button type="button" data-close class="shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center" aria-label="Close">✕</button>
                </div>
                ${item.prompt ? `<div><p class="text-[10px] font-black uppercase tracking-widest text-muted mb-1.5">Prompt</p><p class="text-sm text-secondary leading-relaxed">${esc(item.prompt)}</p></div>` : ''}
                ${settings.length ? `<div class="flex flex-wrap gap-1.5">${settings.map(([k, v]) => `<span class="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-secondary"><span class="text-muted">${esc(k.replace(/_/g, ' '))}</span> ${esc(v)}</span>`).join('')}</div>` : ''}
                <div class="mt-auto flex flex-wrap gap-2 pt-2">
                    ${item.prompt || item.model ? `<a href="${recreateHref(item)}" data-close class="flex-1 text-center px-5 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-colors">Recreate</a>` : ''}
                    ${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener" download class="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors">Download</a>` : ''}
                </div>
            </div>
        </div>`;
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', close, { once: true });
    document.body.appendChild(overlay);
    overlay.querySelector('[data-close]')?.focus();
}

/** Pinterest-style masonry: CSS columns, each card keeps its natural height. */
export const MASONRY = 'columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-3 [&>*]:mb-3 [&>*]:break-inside-avoid';
