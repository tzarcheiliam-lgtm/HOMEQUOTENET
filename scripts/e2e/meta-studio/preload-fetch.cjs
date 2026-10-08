// Loaded with NODE_OPTIONS=--require in the TEST harness only. Redirects Graph API calls from graph.facebook.com to the
// local fake so the real server code (sync, discovery, ad creation, proposals) runs unmodified with no network access to
// Meta. It also refuses any OTHER outbound host, so a stray call to a real service fails loudly instead of leaving the machine.
const fake = process.env.E2E_FAKE_GRAPH_URL;
const allowed = new Set(['localhost', '127.0.0.1']);
const realFetch = globalThis.fetch;
if (fake && realFetch) {
  globalThis.fetch = function patchedFetch(input, init) {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let u; try { u = new URL(href); } catch { return realFetch(input, init); }
    if (u.hostname === 'graph.facebook.com') {
      const target = new URL(u.pathname + u.search, fake);
      return realFetch(typeof input === 'string' || input instanceof URL ? target.href : new Request(target.href, input), init);
    }
    if (!allowed.has(u.hostname)) {
      return Promise.reject(new Error(`[e2e] blocked outbound request to ${u.hostname}`));
    }
    return realFetch(input, init);
  };
}
