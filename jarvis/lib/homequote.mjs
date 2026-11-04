// Calls HomeQuote's Claude connector (POST /api/mcp, JSON-RPC) directly, no AI in the loop. Use a READ-only key.

export class HomeQuoteError extends Error {}

export function homequote({ url, key, fetchImpl = fetch, timeoutMs = 30_000 }) {
  let seq = 0;
  async function rpc(method, params) {
    const res = await fetchImpl(`${url}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++seq, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 401 || res.status === 403) throw new HomeQuoteError('HomeQuote rejected the key (revoked, or its admin is no longer active).');
    if (!res.ok) throw new HomeQuoteError(`HomeQuote answered HTTP ${res.status}`);
    const body = await res.json();
    if (body.error) throw new HomeQuoteError(body.error.message ?? 'HomeQuote error');
    return body.result;
  }
  return {
    /** Tool names this key may use. */
    async listTools() {
      const r = await rpc('tools/list', {});
      return (r.tools ?? []).map((t) => t.name);
    },
    /** Runs a tool and returns its parsed JSON result. */
    async call(name, args = {}) {
      const r = await rpc('tools/call', { name, arguments: args });
      const text = r?.content?.find?.((c) => c.type === 'text')?.text ?? '';
      if (r?.isError) throw new HomeQuoteError(text || `${name} failed`);
      try { return JSON.parse(text); } catch { return text; }
    },
  };
}
