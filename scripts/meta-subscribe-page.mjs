/**
 * Subscribe the Meta app to a Page's `leadgen` webhook field, then print the Page's current subscriptions.
 * Without this, Meta never sends Instant Form leads to /api/integrations/meta/webhook.
 *
 *   META_PAGE_ACCESS_TOKEN=... node scripts/meta-subscribe-page.mjs <page-id>
 *
 * The token is read from the environment only (sent in a header, never printed). Safe to re-run.
 */
const pageId = process.argv[2];
const token = process.env.META_PAGE_ACCESS_TOKEN;
const version = process.env.META_GRAPH_VERSION || 'v26.0';
if (!pageId || !token) {
  console.error('Usage: META_PAGE_ACCESS_TOKEN=... node scripts/meta-subscribe-page.mjs <page-id>');
  process.exit(1);
}
const url = `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/subscribed_apps`;
const headers = { Authorization: `Bearer ${token}` };
const post = await fetch(`${url}?subscribed_fields=leadgen`, { method: 'POST', headers });
console.log('subscribe:', post.status, await post.text());
const get = await fetch(url, { headers });
console.log('current subscriptions:', get.status, await get.text());
