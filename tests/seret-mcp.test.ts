import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
// Only the key check touches the database for these calls; list_models / list_presets are pure.
vi.mock('@/lib/seret/keys', () => ({
  verifyApiKey: async (h: string | null) => (h === 'Bearer seret_good' ? { id: 'k1', name: 'Test' } : null),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('no database in this test'); } }));

const { POST, GET } = await import('@/app/api/seret/mcp/route');

const rpc = (body: unknown, auth = 'Bearer seret_good') =>
  POST(new NextRequest('https://homequotenet.com/api/seret/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) }, body: JSON.stringify(body),
  }));

beforeEach(() => { process.env.KIE_API_KEY = 'test'; });

describe('Seret MCP endpoint', () => {
  it('rejects requests without a valid key', async () => {
    for (const auth of ['', 'Bearer nope']) {
      const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, auth);
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toContain('Bearer');
    }
  });

  it('initializes as a tools server and lists the tools', async () => {
    const init = await (await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })).json();
    expect(init.result).toMatchObject({ capabilities: { tools: {} }, serverInfo: { name: 'seret' } });
    const list = await (await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
    expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual(['list_models', 'list_presets', 'generate_image', 'generate_video', 'get_job', 'list_recent']);
  });

  it('answers notifications with 202 and no body, and refuses GET', async () => {
    const res = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(res.status).toBe(202);
    expect(GET().status).toBe(405);
  });

  it('list_models returns only runnable models with their settings', async () => {
    const res = await (await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_models', arguments: { kind: 'video' } } })).json();
    const models = JSON.parse(res.result.content[0].text);
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) {
      expect(m.kind).toBe('video');
      expect(m.name).toBeTruthy();
      expect(Array.isArray(m.aspect_ratios)).toBe(true);
    }
    expect(models.map((m: { name: string }) => m.name)).not.toContain('Sora 2');
  });

  it('turns a bad tool input into a readable tool error, not a crash', async () => {
    const res = await (await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'generate_image', arguments: { prompt: 'x', model: 'not-a-model' } } })).json();
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toMatch(/Unknown or unavailable image model/);
  });

  it('reports unknown methods as JSON-RPC errors', async () => {
    const res = await (await rpc({ jsonrpc: '2.0', id: 5, method: 'resources/list' })).json();
    expect(res.error.code).toBe(-32601);
  });
});
