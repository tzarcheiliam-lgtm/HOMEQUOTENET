// The user's own finished work, read from each studio's history in this browser (read-only).

export const STUDIOS = {
    image: { label: 'Image', historyKey: 'kie_history', page: 'image' },
    video: { label: 'Video', historyKey: 'video_history', page: 'video' },
    lipsync: { label: 'Lip Sync', historyKey: 'lipsync_history', page: 'lipsync' },
    cinema: { label: 'Cinema', historyKey: 'cinema_history', page: 'cinema' },
};

function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

export const isVideoUrl = (url) => /\.(mp4|webm|mov)(\?|$)/i.test(url || '');

/** Every finished generation across the studios, newest first. Cinema entries keep their prompt under `settings`. */
export function finishedProjects() {
    return Object.entries(STUDIOS)
        .flatMap(([kind, s]) => readJson(s.historyKey).map((e) => ({
            id: e.id || e.url,
            kind,
            page: s.page,
            url: e.url,
            type: kind === 'video' || kind === 'lipsync' || isVideoUrl(e.url) ? 'video' : 'image',
            prompt: e.prompt ?? e.settings?.prompt ?? '',
            model: e.model || '',
            settings: { aspect_ratio: e.aspect_ratio, duration: e.duration, ...(e.settings || {}) },
            at: new Date(e.timestamp).getTime() || 0,
        })))
        .filter((p) => p.url)
        .sort((a, b) => b.at - a.at);
}
