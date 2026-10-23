import { t2iModels, t2vModels } from './models.js';

// Mirrors the id → kie.ai mapping in KieClient (_imageModel / _videoModel).
// Models that match no rule are still in the studio lists but silently run as a
// default model, so the Models page marks them unavailable.
const imageRules = [
    ['nano-banana-pro', 'Nano Banana Pro'],
    ['nano-banana-2', 'Nano Banana 2'],
    ['nano-banana', 'Nano Banana'],
    ['grok', 'Grok Imagine'],
];

// Text-to-video models kie.ai can't run the way Seret calls them (checked against docs.kie.ai, 2026-10-24).
const videoUnavailable = [
    ['kling', 'On kie.ai, Kling 2.1 needs a starting image, so it can\'t do text-to-video'],
    ['seedance-v1.5', 'Seedance 1.5 Pro isn\'t in kie.ai\'s model docs'],
    ['sora', 'Sora 2 isn\'t in kie.ai\'s model docs'],
    ['ovi', 'Sora 2 isn\'t in kie.ai\'s model docs'],
];

const videoRules = [
    ['veo', (id) => (id.includes('fast') ? 'Veo 3 Fast' : id.includes('lite') ? 'Veo 3 Lite' : 'Veo 3')],
    ['kling', (id) => (id.includes('2.1-standard') ? 'Kling 2.1 Standard' : 'Kling 2.1 Pro')],
    ['seedance', (id) => (id.includes('v1.5') ? 'Seedance 1.5 Pro' : id.includes('lite') ? 'Seedance 2 Fast' : 'Seedance 2')],
    ['wan', () => 'Wan 3.0'],
    ['sora', (id) => (id.includes('pro') ? 'Sora 2 Pro' : 'Sora 2')],
    ['ovi', () => 'Sora 2'],
];

function resolve(model, kind) {
    const id = model.id;
    if (kind === 'image') {
        const hit = imageRules.find(([key]) => id.includes(key));
        return hit ? { runsAs: hit[1] } : { runsAs: null, reason: 'Not offered on kie.ai' };
    }
    const blocked = videoUnavailable.find(([key]) => id.includes(key));
    if (blocked) return { runsAs: null, reason: blocked[1] };
    const hit = videoRules.find(([key]) => id.includes(key));
    return hit ? { runsAs: hit[1](id) } : { runsAs: null, reason: 'Not offered on kie.ai' };
}

export function getCatalog() {
    const build = (list, kind) => list.map(m => ({
        id: m.id,
        name: m.name,
        kind,
        ...resolve(m, kind),
    }));
    return [...build(t2iModels, 'image'), ...build(t2vModels, 'video')];
}

const prefKey = (kind) => `motc_model_${kind}`;

export function getPreferredModel(kind, fallbackList) {
    try {
        const id = localStorage.getItem(prefKey(kind));
        return fallbackList.find(m => m.id === id) || null;
    } catch { return null; }
}

export function setPreferredModel(kind, id) {
    localStorage.setItem(prefKey(kind), id);
}

export function getPreferredId(kind) {
    return localStorage.getItem(prefKey(kind));
}
