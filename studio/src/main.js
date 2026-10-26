import './style.css';
import { Shell } from './components/Shell.js';
import { getCatalog, setPreferredModel } from './lib/catalog.js';
import { currentRoute, go } from './lib/router.js';

// kie.ai key from .env.local (VITE_KIE_KEY) overrides any key saved in the browser.
if (import.meta.env.VITE_KIE_KEY) {
  localStorage.setItem('kie_key', import.meta.env.VITE_KIE_KEY);
}

const { root, content, setActive } = Shell();
document.querySelector('#app').replaceChildren(root);

// Each page is its own chunk, loaded on first visit.
const PAGES = {
  explore: () => import('./components/ExplorePage.js').then((m) => m.ExplorePage()),
  models: (r) => (r.id
    ? import('./components/ModelDetailPage.js').then((m) => m.ModelDetailPage(r.id))
    : import('./components/ModelsPage.js').then((m) => m.ModelsPage())),
  image: () => import('./components/ImageStudio.js').then((m) => m.ImageStudio()),
  video: () => import('./components/VideoStudio.js').then((m) => m.VideoStudio()),
  lipsync: () => import('./components/LipSyncStudio.js').then((m) => m.LipSyncStudio()),
  cinema: () => import('./components/CinemaStudio.js').then((m) => m.CinemaStudio()),
  projects: () => import('./components/ProjectsPage.js').then((m) => m.ProjectsPage()),
};

let seq = 0;
async function render() {
  const route = currentRoute();
  const n = ++seq;
  setActive(route.page);

  // ?model= picks the studio's model (studios read the preferred model when they mount). Only real ids of
  // that kind are accepted, so a bad link can't change someone's default to something that doesn't exist.
  const { model, prompt } = route.params;
  if (model && (route.page === 'image' || route.page === 'video') && getCatalog().some((m) => m.id === model && m.kind === route.page)) {
    setPreferredModel(route.page, model);
  }

  const el = await PAGES[route.page](route);
  if (n !== seq) return; // a newer navigation already won
  content.replaceChildren(el);

  // ?prompt= fills the studio's prompt box.
  if (prompt) {
    const box = el.querySelector('[data-prompt-box]');
    if (box) {
      box.value = prompt;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.focus();
    }
  }
}

window.addEventListener('hashchange', render);
// Older code asks to switch pages with a 'navigate' event; route it through the URL.
window.addEventListener('navigate', (e) => go(e.detail?.page || 'explore'));
render();
