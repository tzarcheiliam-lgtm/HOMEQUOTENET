// Hash routes, so links, refresh and the back button work inside the static /studio page:
// #/  #/models  #/models/<id>  #/image  #/video  #/lipsync  #/cinema  #/projects
// Studios accept ?prompt=…&model=… so Explore, presets and model pages can deep-link in.

export const PAGES = ['explore', 'models', 'image', 'video', 'lipsync', 'cinema', 'projects'];

/** Current route: { page, id, params } (page 'explore' for #/ or anything unknown). */
export function currentRoute() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    const [first = '', id = ''] = path.split('/').map(decodeURIComponent);
    const page = PAGES.includes(first) ? first : 'explore';
    return { page, id: page === 'models' ? id : '', params: Object.fromEntries(new URLSearchParams(query)) };
}

/** Build a hash link, e.g. href('image', { prompt: 'a kitchen' }) -> '#/image?prompt=a+kitchen'. */
export function href(page, params = {}, id = '') {
    const path = page === 'explore' ? '' : page + (id ? '/' + encodeURIComponent(id) : '');
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    const query = new URLSearchParams(clean).toString();
    return `#/${path}${query ? '?' + query : ''}`;
}

export function go(page, params, id) {
    location.hash = href(page, params, id);
}
