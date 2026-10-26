import { NextResponse, type NextRequest } from 'next/server';
import { verifyApiKey } from '@/lib/seret/keys';
import {
  SeretError, describe, getGeneration, listModels, listPresets, recentGenerations, refreshGeneration, startGeneration, waitFor,
  type GenerationRow, type Kind,
} from '@/lib/seret/engine';

/**
 * Seret as an MCP server (Streamable HTTP, stateless): Claude connects with an API key from /app/seret-api and can
 * list models, make images and videos for ads, and check on jobs. JSON-RPC over POST with plain JSON replies;
 * GET/DELETE answer 405 (allowed by the MCP spec for servers without a stream or sessions).
 */
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const PROTOCOL = '2025-06-18';
const IMAGE_WAIT_MS = 45_000;

const INSTRUCTIONS = `Seret is HomeQuote Network's AI studio for home-service ads (remodels, pools, roofing, ADUs, HVAC…).
Use list_models to see what can run and each model's allowed aspect ratios, resolutions and durations; list_presets for proven ad prompts.
generate_image usually returns the finished image link within the call. generate_video returns a job id: videos take 1-5 minutes, so call get_job to check. Each generation spends the owner's kie.ai credits, so don't create variations nobody asked for.
For ads: vertical 9:16 suits Reels/Stories/TikTok, 4:5 suits feed posts, 16:9 suits YouTube and landing pages.`;

const TOOLS = [
  {
    name: 'list_models',
    title: 'List Seret models',
    description: 'Models Seret can run (one per kie.ai model) with maker, what each is best for, and the aspect ratios, resolutions and durations it accepts.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['image', 'video'], description: 'Only image or only video models.' } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_presets',
    title: 'List ad presets',
    description: 'Ready-made home-service ad prompts (kitchen reveal, bathroom before/after, pool flyover, roof, ADU walkthrough…) with a suggested model and aspect ratio.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'generate_image',
    title: 'Generate an image',
    description: 'Create an image with Seret. Waits up to ~45s and returns a link to the finished image; if it is still running, returns a job id for get_job. Spends kie.ai credits.',
    inputSchema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', description: 'What the image should show. Be specific about the space, materials, light and camera.' },
        model: { type: 'string', description: 'Model id or name from list_models. Default: Nano Banana 2.' },
        aspect_ratio: { type: 'string', description: 'e.g. 1:1, 4:5, 9:16, 16:9 (must be one the model allows).' },
        resolution: { type: 'string', description: 'e.g. 1k, 2k, 4k if the model offers it.' },
      },
    },
  },
  {
    name: 'generate_video',
    title: 'Start a video',
    description: 'Start a video with Seret and return its job id right away. Videos take about 1-5 minutes; check with get_job. Spends kie.ai credits.',
    inputSchema: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', description: 'The shot: subject, camera movement, light, mood.' },
        model: { type: 'string', description: 'Model id or name from list_models. Default: Seedance 2.' },
        aspect_ratio: { type: 'string', description: 'e.g. 16:9, 9:16, 1:1 (must be one the model allows).' },
        resolution: { type: 'string', description: 'e.g. 480p, 720p, 1080p if the model offers it.' },
        duration: { type: 'number', description: 'Length in seconds, if the model offers a choice.' },
      },
    },
  },
  {
    name: 'get_job',
    title: 'Check a job',
    description: 'Status of an image or video job (running / success / failed) and, when finished, a link to the file (valid 7 days; call again for a fresh link).',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string', description: 'Job id from generate_image or generate_video.' } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_recent',
    title: 'List recent jobs',
    description: 'The most recent images and videos made through the Seret API, newest first, with their status and links.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'How many (1-50). Default 10.' } } },
    annotations: { readOnlyHint: true },
  },
];

type Json = Record<string, unknown>;
const text = (value: unknown, isError = false) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
  ...(isError ? { isError: true } : {}),
});
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

async function callTool(name: string, args: Json, apiKeyId: string) {
  switch (name) {
    case 'list_models':
      return text(listModels(args.kind === 'image' || args.kind === 'video' ? (args.kind as Kind) : undefined));
    case 'list_presets':
      return text(listPresets());
    case 'generate_image': {
      const row = await startGeneration({ kind: 'image', prompt: str(args.prompt) ?? '', model: str(args.model), aspect_ratio: str(args.aspect_ratio), resolution: str(args.resolution), apiKeyId });
      const done = await waitFor(row, IMAGE_WAIT_MS);
      return text(await describe(done));
    }
    case 'generate_video': {
      const duration = typeof args.duration === 'number' ? args.duration : undefined;
      const row = await startGeneration({ kind: 'video', prompt: str(args.prompt) ?? '', model: str(args.model), aspect_ratio: str(args.aspect_ratio), resolution: str(args.resolution), duration, apiKeyId });
      return text({ ...(await describe(row)), next: 'Videos take about 1-5 minutes. Call get_job with this id to check.' });
    }
    case 'get_job': {
      const row = await getGeneration(str(args.id) ?? '');
      if (!row) return text('No job with that id.', true);
      return text(await describe(await refreshGeneration(row)));
    }
    case 'list_recent': {
      const limit = typeof args.limit === 'number' ? Math.min(Math.max(Math.round(args.limit), 1), 50) : 10;
      const rows = await recentGenerations(limit);
      // Refresh anything still running (a few at most) so the list is current.
      const fresh: GenerationRow[] = await Promise.all(rows.map((r, i) => (r.status === 'running' && i < 5 ? refreshGeneration(r).catch(() => r) : r)));
      return text(await Promise.all(fresh.map(describe)));
    }
    default:
      throw new RpcError(-32602, `Unknown tool: ${name}`);
  }
}

class RpcError extends Error {
  constructor(public code: number, message: string) { super(message); }
}

async function handle(msg: Json, apiKeyId: string): Promise<Json | null> {
  const id = msg.id as string | number | undefined;
  const method = msg.method as string | undefined;
  // Notifications (no id) get no reply.
  if (id === undefined || id === null) return null;
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id, result });
  try {
    switch (method) {
      case 'initialize':
        return reply({
          protocolVersion: PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'seret', title: 'Seret by HomeQuote Network', version: '1.0.0' },
          instructions: INSTRUCTIONS,
        });
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({ tools: TOOLS });
      case 'tools/call': {
        const params = (msg.params ?? {}) as Json;
        try {
          return reply(await callTool(String(params.name), (params.arguments ?? {}) as Json, apiKeyId));
        } catch (e) {
          if (e instanceof RpcError) throw e;
          // Tool problems (bad model, kie.ai error) go back to Claude as a tool error it can read and fix.
          const message = e instanceof SeretError ? e.message : `Seret error: ${(e as Error).message}`;
          return reply(text(message, true));
        }
      }
      default:
        throw new RpcError(-32601, `Method not found: ${method}`);
    }
  } catch (e) {
    const err = e instanceof RpcError ? e : new RpcError(-32603, 'Internal error');
    return { jsonrpc: '2.0', id, error: { code: err.code, message: err.message } };
  }
}

export async function POST(request: NextRequest) {
  const key = await verifyApiKey(request.headers.get('authorization'));
  if (!key) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Missing or invalid Seret API key. Send "Authorization: Bearer seret_…" (create one at /app/seret-api).' } },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="seret"' } }
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request: send one JSON-RPC message' } }, { status: 400 });
  }
  const out = await handle(body as Json, key.id);
  if (!out) return new NextResponse(null, { status: 202 });
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}

const notAllowed = () => new NextResponse(null, { status: 405, headers: { Allow: 'POST' } });
export const GET = notAllowed;
export const DELETE = notAllowed;
