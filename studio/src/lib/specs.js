import {
    getAspectRatiosForModel, getAspectRatiosForVideoModel, getDurationsForModel, getModelById,
    getQualityFieldForModel, getResolutionsForModel, getResolutionsForVideoModel, getVideoModelById,
} from './models.js';

// Specs come only from each model's `inputs` (models.js). Nothing here is typed in by hand.

const rawModel = (m) => (m.kind === 'image' ? getModelById(m.id) : getVideoModelById(m.id));

export function specsFor(m) {
    const raw = rawModel(m) || { inputs: {} };
    const inputs = raw.inputs || {};
    const isImage = m.kind === 'image';
    const aspect = (isImage ? getAspectRatiosForModel(m.id) : getAspectRatiosForVideoModel(m.id)) || [];
    const res = (isImage ? getResolutionsForModel(m.id) : getResolutionsForVideoModel(m.id)) || [];
    const dur = isImage ? [] : (getDurationsForModel(m.id) || []);
    const qField = isImage ? getQualityFieldForModel(m.id) : null;
    const quality = qField && qField !== 'resolution' ? (inputs[qField]?.enum || []) : [];
    const settings = Object.values(inputs)
        // Only settings the rows above don't already cover.
        .filter((i) => i && i.name && !['prompt', 'aspect_ratio', 'resolution', 'duration', qField].includes(i.name))
        .map((i) => i.title || i.name.replace(/_/g, ' '));
    const examples = (inputs.prompt?.examples || []).filter((e) => typeof e === 'string' && e.length > 10);
    return { aspect, res, dur, quality, settings, examples };
}

/** Up to four short capability chips for cards. */
export function chipsFor(m) {
    const s = specsFor(m);
    const chips = [];
    const secs = s.dur.map(Number).filter(Boolean);
    if (secs.length) chips.push(`up to ${Math.max(...secs)}s`);
    const top = s.res.map(String).find((r) => /4k/i.test(r)) || s.res.map(String).find((r) => /1080/.test(r)) || s.res.map(String).at(-1);
    if (top) chips.push(top.toUpperCase().replace('P', 'p'));
    if (s.aspect.includes('9:16')) chips.push('Vertical 9:16');
    if (s.aspect.length > 1) chips.push(`${s.aspect.length} aspect ratios`);
    return chips.slice(0, 4);
}
