// Minimal Telegram Bot API client (long polling, plain-text messages). No webhook, so nothing listens on the network.
import { splitMessage } from './format.mjs';

// TELEGRAM_API_BASE is only for tests (a local fake Telegram).
const BASE = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';

export function telegram({ token, fetchImpl = fetch }) {
  async function api(method, body = {}, timeoutMs = 20_000) {
    const res = await fetchImpl(`${BASE}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) {
      const err = new Error(`Telegram ${method}: ${json.description ?? `HTTP ${res.status}`}`);
      err.retryAfter = json.parameters?.retry_after;
      throw err;
    }
    return json.result;
  }
  return {
    api,
    getMe: () => api('getMe'),
    /** Long poll: waits up to `timeout` seconds for new messages. */
    getUpdates: (offset, timeout = 50) => api('getUpdates', { offset, timeout, allowed_updates: ['message'] }, (timeout + 15) * 1000),
    typing: (chatId) => api('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {}),
    async send(chatId, text) {
      for (const chunk of splitMessage(text)) {
        await api('sendMessage', { chat_id: chatId, text: chunk, link_preview_options: { is_disabled: true } });
      }
    },
  };
}
