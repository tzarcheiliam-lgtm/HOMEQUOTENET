import { href } from '../lib/router.js';

// Approximate USD value of one kie.ai credit; confirm against your kie.ai billing page.
export const CREDIT_USD = Number(import.meta.env.VITE_CREDIT_USD) || 0.005;

const icon = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const NAV = [
    { page: 'explore', label: 'Explore', icon: icon('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>') },
    { page: 'image', label: 'Image', icon: icon('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>') },
    { page: 'video', label: 'Video', icon: icon('<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3z"/>') },
    { page: 'lipsync', label: 'Lip Sync', icon: icon('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>') },
    { page: 'cinema', label: 'Cinema', icon: icon('<path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m3 9 2.5-5 4 1-2 4M10 5l4 1-2 3M15 6l4 1-1.5 2"/>') },
    { page: 'models', label: 'Models', icon: icon('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>') },
    { page: 'projects', label: 'Projects', icon: icon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>') },
];

/**
 * App chrome: a left icon rail on desktop, a bottom bar on phones, and a slim top bar with the kie.ai credits.
 * Returns the root plus the element pages render into, and setActive(page) to move the highlight.
 */
export function Shell() {
    const root = document.createElement('div');
    root.className = 'flex w-full h-full';

    const rail = document.createElement('nav');
    rail.setAttribute('aria-label', 'Seret');
    rail.className = 'hidden lg:flex flex-col items-center w-[84px] shrink-0 bg-black border-r border-white/5 py-4 gap-1 z-30';
    rail.innerHTML = `
        <a href="${href('explore')}" class="mb-4" title="Seret by HomeQuote Network">
            <img src="/brand/seret-icon.svg" alt="Seret" width="40" height="40" class="w-10 h-10">
        </a>`;

    const main = document.createElement('div');
    main.className = 'flex-1 min-w-0 flex flex-col';

    const top = document.createElement('div');
    top.className = 'h-14 shrink-0 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-white/5 bg-black/80 backdrop-blur-md z-30';
    top.innerHTML = `
        <a href="${href('explore')}" class="flex items-center gap-2.5 min-w-0">
            <img src="/brand/seret-icon.svg" alt="" width="30" height="30" class="w-[30px] h-[30px] lg:hidden">
            <span class="font-display text-lg font-bold tracking-tight text-white">Seret</span>
            <span class="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-secondary">by HomeQuote Network</span>
        </a>`;

    const content = document.createElement('main');
    content.id = 'content-area';
    content.className = 'flex-1 relative w-full overflow-hidden flex flex-col bg-app-bg';

    const bottom = document.createElement('nav');
    bottom.setAttribute('aria-label', 'Seret');
    bottom.className = 'lg:hidden shrink-0 h-16 grid grid-cols-7 border-t border-white/5 bg-black z-30';

    const links = [];
    NAV.forEach((item) => {
        const a = document.createElement('a');
        a.href = href(item.page);
        a.dataset.page = item.page;
        a.className = 'group relative flex flex-col items-center justify-center gap-1 w-[68px] h-[60px] rounded-2xl text-secondary hover:text-white hover:bg-white/5 transition-colors';
        a.innerHTML = `${item.icon}<span class="text-[10px] font-bold">${item.label}</span>`;
        rail.appendChild(a);
        const b = document.createElement('a');
        b.href = href(item.page);
        b.dataset.page = item.page;
        b.className = 'relative flex flex-col items-center justify-center gap-0.5 text-secondary';
        b.innerHTML = `${item.icon}<span class="text-[9px] font-bold leading-none">${item.label}</span>`;
        bottom.appendChild(b);
        links.push(a, b);
    });

    top.appendChild(CreditsPill());
    main.append(top, content, bottom);
    root.append(rail, main);

    const setActive = (page) => {
        links.forEach((l) => {
            const on = l.dataset.page === page;
            l.classList.toggle('text-white', on);
            l.classList.toggle('text-secondary', !on);
            l.classList.toggle('bg-white/[0.07]', on && rail.contains(l));
            if (on) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
            l.querySelector('[data-dot]')?.remove();
            if (on) {
                const dot = document.createElement('span');
                dot.dataset.dot = '1';
                dot.className = rail.contains(l)
                    ? 'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-gold'
                    : 'absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-gold';
                l.appendChild(dot);
            }
        });
    };

    return { root, content, setActive };
}

/** kie.ai balance, plus credits spent since this tab loaded. */
function CreditsPill() {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-secondary transition-colors';
    pill.title = 'kie.ai credits — click to refresh';
    pill.textContent = 'Credits: …';
    let startBalance = null;
    const refresh = async () => {
        try {
            const { kie } = await import('../lib/kie.js');
            const balance = await kie.getCredits();
            if (startBalance === null) startBalance = balance;
            const spent = Math.max(0, startBalance - balance);
            const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
            const usd = (n) => '$' + (n * CREDIT_USD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            pill.innerHTML = `<span class="text-white">${usd(balance)}</span> <span class="hidden sm:inline text-muted">· ${fmt(balance)} credits</span>` +
                (spent > 0 ? ` <span class="text-primary">−${usd(spent)}</span>` : '');
            pill.title = `1 credit ≈ $${CREDIT_USD} (set VITE_CREDIT_USD to change). Click to refresh.`;
        } catch (err) {
            pill.textContent = 'Credits: n/a';
            pill.title = err.message;
        }
    };
    pill.onclick = refresh;
    window.addEventListener('credits-refresh', () => setTimeout(refresh, 1500));
    setInterval(refresh, 60000);
    refresh();
    return pill;
}
