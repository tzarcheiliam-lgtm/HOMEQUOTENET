// Hand-written details for the models kie.ai actually runs, keyed by `runsAs` from catalog.js (several Seret
// model ids run as the same kie.ai model, so they share one entry). Specs are NOT kept here: they come from
// each model's `inputs` in models.js. Prices are only filled where kie.ai's own site shows them; everything
// else stays empty and the UI shows nothing. Update `checked` when you re-verify.

const KIE_HOME = 'https://kie.ai/';
const checked = '2026-10-23';

export const MODEL_INFO = {
    'Nano Banana': {
        maker: 'Google',
        tagline: 'Fast everyday image generation and edits.',
        description: 'Google\'s original Nano Banana image model. Quick to turn a prompt into a clean, realistic image.',
        bestFor: ['Social posts', 'Quick concept shots', 'Simple product and room photos'],
    },
    'Nano Banana 2': {
        maker: 'Google',
        tagline: 'Sharper detail with 1K, 2K and 4K output.',
        description: 'The second generation of Google\'s Nano Banana, with higher-resolution output and better detail.',
        bestFor: ['Remodel renderings', 'Ad creative', 'Before/after concepts'],
        price: { text: 'from $0.04 per image (1K)', source: KIE_HOME, checked },
    },
    'Nano Banana Pro': {
        maker: 'Google',
        tagline: 'Google\'s top image model for polished, high-detail results.',
        description: 'The Pro tier of Nano Banana, aimed at the most detailed and accurate images.',
        bestFor: ['Hero images for landing pages', 'High-end kitchen and bath visuals', 'Print-quality shots'],
        price: { text: 'from $0.09 per image (1K/2K)', source: KIE_HOME, checked },
    },
    'Grok Imagine': {
        maker: 'xAI',
        tagline: 'Bold, stylized images from xAI.',
        description: 'xAI\'s Grok Imagine image model, good for eye-catching, stylized looks.',
        bestFor: ['Scroll-stopping ad visuals', 'Stylized promos'],
    },
    'Seedance 2': {
        maker: 'ByteDance',
        tagline: 'Smooth, cinematic motion from a prompt.',
        description: 'ByteDance\'s Seedance 2 video model, known for fluid camera movement.',
        bestFor: ['Walkthroughs of finished projects', 'Drone-style flyovers', 'Reels'],
    },
    'Seedance 2 Fast': {
        maker: 'ByteDance',
        tagline: 'Seedance 2, tuned for speed.',
        description: 'A faster Seedance 2 option for quick drafts and lots of variations.',
        bestFor: ['Testing ideas before a final render', 'Short social clips'],
    },
    'Seedance 1.5 Pro': {
        maker: 'ByteDance',
        tagline: 'The earlier Seedance Pro generation.',
        description: 'ByteDance\'s Seedance 1.5 Pro video model.',
        bestFor: ['Short product and project clips'],
    },
    'Kling 2.1 Pro': {
        maker: 'Kuaishou',
        tagline: 'Realistic motion and lighting.',
        description: 'Kuaishou\'s Kling 2.1 Pro video model, strong on realistic movement.',
        bestFor: ['Realistic home tours', 'Exterior shots', 'Lifestyle clips'],
    },
    'Veo 3': {
        maker: 'Google',
        tagline: 'Google\'s flagship video model.',
        description: 'Google\'s Veo 3, built for high-quality, cinematic video.',
        bestFor: ['Premium ad spots', 'Brand videos'],
    },
    'Veo 3 Fast': {
        maker: 'Google',
        tagline: 'Veo 3 quality, faster and cheaper.',
        description: 'The faster Veo 3 option, a good balance of quality and cost.',
        bestFor: ['Everyday video ads', 'Reels and Shorts'],
    },
    'Wan 3.0': {
        maker: 'Alibaba',
        tagline: 'Affordable, capable video generation.',
        description: 'Alibaba\'s Wan video model, a cost-effective choice for lots of clips.',
        bestFor: ['High-volume social content', 'B-roll'],
        price: { text: 'from $0.04 per second', source: KIE_HOME, checked },
    },
    'Sora 2': {
        maker: 'OpenAI',
        tagline: 'OpenAI\'s video model.',
        description: 'OpenAI\'s Sora 2 video model.',
        bestFor: ['Storytelling clips', 'Creative concepts'],
    },
    'Sora 2 Pro': {
        maker: 'OpenAI',
        tagline: 'The higher-quality Sora 2 tier.',
        description: 'OpenAI\'s Sora 2 Pro, the premium Sora option.',
        bestFor: ['Hero videos', 'Premium campaigns'],
    },
};

export const infoFor = (runsAs) => (runsAs && MODEL_INFO[runsAs]) || null;
export const PRICING_URL = 'https://kie.ai/pricing';
