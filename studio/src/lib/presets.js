// One-click starting points on Explore, written for home-service ads. Each opens a studio with the prompt,
// model and settings filled in. Model ids must be ones that run on kie.ai (see catalog.js).

export const PRESETS = [
    {
        id: 'kitchen-reveal',
        title: 'Kitchen remodel reveal',
        page: 'image',
        model: 'nano-banana-2',
        aspect_ratio: '4:5',
        prompt: 'Bright modern kitchen remodel, white oak cabinets, quartz waterfall island, brass fixtures, soft morning light through large windows, wide-angle real estate photo, ultra realistic',
    },
    {
        id: 'bath-before-after',
        title: 'Bathroom before & after',
        page: 'image',
        model: 'nano-banana-pro',
        aspect_ratio: '16:9',
        prompt: 'Split image before and after bathroom remodel: left side dated 1990s bathroom with beige tile, right side spa-style bathroom with walk-in glass shower, matte black fixtures, warm lighting, realistic photo',
    },
    {
        id: 'pool-flyover',
        title: 'Backyard pool flyover',
        page: 'video',
        model: 'seedance-pro-t2v',
        aspect_ratio: '9:16',
        prompt: 'Slow cinematic drone flyover of a new luxury backyard pool at golden hour, crystal clear water, travertine deck, outdoor lounge, warm sunlight, realistic',
    },
    {
        id: 'roof-replacement',
        title: 'New roof, curb appeal',
        page: 'image',
        model: 'nano-banana-2',
        aspect_ratio: '16:9',
        prompt: 'Suburban two-story home with a brand new charcoal architectural shingle roof, clean gutters, blue sky, freshly cut lawn, professional real estate exterior photo',
    },
    {
        id: 'adu-walkthrough',
        title: 'ADU walkthrough',
        page: 'video',
        model: 'kling-v2.1-master-t2v',
        aspect_ratio: '16:9',
        prompt: 'Smooth walkthrough of a modern backyard ADU at dusk, glass sliding doors opening to a bright open-plan living space, warm interior lights, realistic camera movement',
    },
    {
        id: 'contractor-intro',
        title: 'Talking-head intro',
        page: 'lipsync',
        prompt: 'Friendly, confident contractor introducing their company to camera, natural head movement',
    },
];
