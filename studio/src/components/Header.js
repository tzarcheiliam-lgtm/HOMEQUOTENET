

// Approximate USD value of one kie.ai credit; confirm against your kie.ai billing page.
const CREDIT_USD = Number(import.meta.env.VITE_CREDIT_USD) || 0.005;

export function Header(navigate) {
    const header = document.createElement('header');
    header.className = 'w-full flex flex-col z-50 sticky top-0';


    // 2. Main Navigation Bar
    const navBar = document.createElement('div');
    navBar.className = 'w-full h-16 bg-black flex items-center justify-between px-4 md:px-6 border-b border-white/5 backdrop-blur-md bg-opacity-95';

    const leftPart = document.createElement('div');
    leftPart.className = 'flex items-center gap-8';

    // Logo + wordmark
    const logoContainer = document.createElement('div');
    logoContainer.className = 'flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform';
    logoContainer.innerHTML = `
        <img src="/brand/seret-icon.svg" alt="Seret" width="34" height="34" class="w-[34px] h-[34px]">
        <span class="font-display text-lg font-bold tracking-tight text-white">Seret</span><span class="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-secondary">by HomeQuote Network</span>
    `;
    logoContainer.onclick = () => { navigate('image'); activate('Image'); };

    const menu = document.createElement('nav');
    menu.className = 'hidden lg:flex items-center gap-6 text-[13px] font-bold text-secondary';
    const items = ['Image', 'Models', 'Video', 'Lip Sync', 'Cinema Studio', 'Projects'];

    const pageForItem = { 'Image': 'image', 'Models': 'models', 'Video': 'video', 'Lip Sync': 'lipsync', 'Cinema Studio': 'cinema', 'Projects': 'projects' };
    const links = {};

    const activate = (name) => {
        Object.entries(links).forEach(([label, link]) => {
            link.classList.remove('text-white');
            const d = link.querySelector('[data-nav-dot]');
            if (d) d.remove();
        });
        const link = links[name];
        link.classList.add('text-white');
        const dot = document.createElement('div');
        dot.className = 'absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-gold rounded-full';
        dot.setAttribute('data-nav-dot', '1');
        link.appendChild(dot);
    };

    items.forEach(name => {
        const link = document.createElement('a');
        link.textContent = name;
        link.className = `hover:text-white transition-all cursor-pointer relative group ${name === 'Image' ? 'text-white' : ''}`;

        link.onclick = () => {
            activate(name);
            navigate(pageForItem[name]);
        };

        if (name === 'Image') {
            const dot = document.createElement('div');
            dot.className = 'absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-gold rounded-full';
            dot.setAttribute('data-nav-dot', '1');
            link.appendChild(dot);
        }

        links[name] = link;
        menu.appendChild(link);
    });

    // Pages can switch studios themselves (e.g. Projects → "Open Image"); keep the menu highlight in step.
    window.addEventListener('navigate', (e) => {
        const name = Object.keys(pageForItem).find((k) => pageForItem[k] === e.detail?.page);
        if (name) activate(name);
    });

    leftPart.appendChild(logoContainer);
    leftPart.appendChild(menu);

    const rightPart = document.createElement('div');
    rightPart.className = 'flex items-center gap-4';

    // Credits pill: balance + credits spent since this tab loaded.
    const creditsPill = document.createElement('button');
    creditsPill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-secondary transition-colors';
    creditsPill.title = 'kie.ai credits — click to refresh';
    creditsPill.textContent = 'Credits: …';
    let startBalance = null;
    const refreshCredits = async () => {
        try {
            const { kie } = await import('../lib/kie.js');
            const balance = await kie.getCredits();
            if (startBalance === null) startBalance = balance;
            const spent = Math.max(0, startBalance - balance);
            const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
            const usd = (n) => '$' + (n * CREDIT_USD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            creditsPill.innerHTML = `<span class="text-white">${usd(balance)}</span> <span class="text-muted">· ${fmt(balance)} credits</span>` +
                (spent > 0 ? ` <span class="text-primary">−${usd(spent)} this session</span>` : '');
            creditsPill.title = `1 credit ≈ $${CREDIT_USD} (set VITE_CREDIT_USD in .env.local to change). Click to refresh.`;
        } catch (err) {
            creditsPill.textContent = 'Credits: n/a';
            creditsPill.title = err.message;
        }
    };
    creditsPill.onclick = refreshCredits;
    window.addEventListener('credits-refresh', () => setTimeout(refreshCredits, 1500));
    setInterval(refreshCredits, 60000);
    refreshCredits();
    rightPart.appendChild(creditsPill);

    navBar.appendChild(leftPart);
    navBar.appendChild(rightPart);

    header.appendChild(navBar);

    return header;
}
