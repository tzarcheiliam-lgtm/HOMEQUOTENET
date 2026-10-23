/**
 * Creative Studio: third-party image/video generator embeds shown on /app/creative-studio (admin only).
 *
 * TO ADD ANOTHER EMBED: paste the id from the embed code's iframe src
 * (`https://muapi.ai/embed/<ID>` -> `<ID>`) as a new entry below and give it a title, a `kind` and a one-line
 * description. Order here is the order on the page. Nothing else needs to change; a new `kind` automatically
 * becomes a new filter chip.
 *
 * Only the id is stored (never raw embed HTML): the page builds the iframe itself, always on muapi.ai.
 */
export interface CreativeTool {
  /** Stable slug used for selection and as a React key. */
  slug: string;
  title: string;
  /** What it makes, e.g. 'Text to Video'. Drives the filter chips. */
  kind: string;
  description: string;
  /** The UUID from https://muapi.ai/embed/<embedId>. */
  embedId: string;
}

export const EMBED_HOST = 'https://muapi.ai/embed/';
export const EMBED_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const embedSrc = (embedId: string) => `${EMBED_HOST}${embedId}`;

/**
 * The featured assistant shown at the TOP of the page (muapi's agent embed, a different URL shape from the
 * generators below: `https://muapi.ai/embed/agent/<agentId>`). Set to null to hide the panel.
 */
export interface CreativeAgent { title: string; description: string; agentId: string }
export const AGENT_HOST = 'https://muapi.ai/embed/agent/';
export const AGENT_ID = /^[A-Za-z0-9_-]{16,64}$/;
export const agentSrc = (agentId: string) => `${AGENT_HOST}${agentId}`;

export const CREATIVE_AGENT: CreativeAgent | null = {
  title: 'Creative Assistant',
  description: 'Describe what you want and the assistant generates the image or video for you.',
  agentId: 'MYDb5661RPR5SZoUXdL2p3NznT9YnZcQ',
};

export const CREATIVE_TOOLS: CreativeTool[] = [
  {
    slug: 'seedance-2',
    title: 'Seedance 2',
    kind: 'Video',
    description: 'Seedance 2 video generator.',
    embedId: '404b73cb-7d75-40b9-96e9-3965c768fa70',
  },
  {
    slug: 'runway-aleph-v2v',
    title: 'Runway Aleph V2V',
    kind: 'Video to Video',
    description:
      'Transform any input video into a new visual style or scene while preserving motion and structure. Apply artistic looks, cinematic lighting, or thematic changes to existing footage.',
    embedId: '69fbd591-9410-47ae-862d-3171e5baacac',
  },
  {
    slug: 'seedance-2-spicy-omni-reference-fast',
    title: 'Seedance 2 Spicy Omni Reference Fast',
    kind: 'Image to Video',
    description:
      'Faster video generation by ByteDance using up to 9 image references, 3 video clips and 3 audio references, with priority routing and reduced content-safety filtering. Reference materials in your prompt with @image1…@image9, @video1…@video3 and @audio1…@audio3. Output resolution is selectable (720p / 1080p / 4K); price scales with the resolution.',
    embedId: '01e6d66b-b009-4f72-8498-d2441010d7ca',
  },
];
