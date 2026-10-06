import 'server-only';

/**
 * Minimal Fish Audio Agents API client (outbound phone calls + webhook config).
 * Endpoints and fields are taken from the official docs:
 *   POST  https://api.fish.audio/v1/agent/phone-calls
 *     https://docs.fish.audio/api-reference/endpoint/agent/create-phone-call
 *   PATCH https://api.fish.audio/v1/agent/agents/{agent_id}/config
 *     https://docs.fish.audio/agents/monitor/webhooks#configure-the-endpoint
 * Auth is `Authorization: Bearer <FISH_API_KEY>`. The key is never logged.
 */
const BASE_URL = 'https://api.fish.audio';
const TIMEOUT_MS = 15_000;

export class FishApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'FishApiError';
  }
}

function apiKey(): string {
  const key = process.env.FISH_API_KEY?.trim();
  if (!key) throw new FishApiError(0, 'FISH_API_KEY is not set');
  return key;
}

async function fishFetch(path: string, init: RequestInit & { headers?: Record<string, string> }) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) {
    // Status only: response bodies can echo request data (numbers, variables).
    throw new FishApiError(res.status, `Fish API ${init.method ?? 'GET'} ${path} failed with HTTP ${res.status}`);
  }
  return res;
}

export interface CreatePhoneCallInput {
  agentId: string;
  /** The team-owned Fish number to dial from (not the E.164 string). */
  phoneNumberId: string;
  /** Destination, E.164. */
  toNumber: string;
  /** Required by us: a retry with the same key never dials twice (24h window). */
  idempotencyKey: string;
  dynamicVariables?: Record<string, string | number | boolean>;
  /** Echoed back on every webhook as `session.metadata`. */
  metadata?: Record<string, unknown>;
}

export async function createPhoneCall(input: CreatePhoneCallInput): Promise<{ sessionId: string; status: 'queued' }> {
  const body: Record<string, unknown> = {
    agent_id: input.agentId,
    phone_number_id: input.phoneNumberId,
    to_number: input.toNumber,
  };
  if (input.dynamicVariables) body.dynamic_variables = input.dynamicVariables;
  if (input.metadata) body.metadata = input.metadata;
  const res = await fishFetch('/v1/agent/phone-calls', {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { session_id?: string; status?: string };
  if (!json.session_id) throw new FishApiError(res.status, 'Fish API returned no session_id');
  return { sessionId: json.session_id, status: 'queued' };
}

/**
 * Replaces the agent's whole `webhooks.post_call` list (Fish replaces it as a
 * unit). Changes reach production calls only after the agent is published.
 */
export async function setPostCallWebhooks(agentId: string, endpoints: { url: string; secret?: string }[]): Promise<void> {
  await fishFetch(`/v1/agent/agents/${encodeURIComponent(agentId)}/config`, {
    method: 'PATCH',
    body: JSON.stringify({ webhooks: { post_call: endpoints } }),
  });
}
