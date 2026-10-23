/** Pure parsing of a pasted embed code (or bare URL) into the one thing the page needs: an https iframe src. */

export interface ParsedEmbed {
  src: string;
  /** muapi's agent/assistant embeds (`/embed/agent/<id>`) are shown in the panel at the top of the page. */
  isAgent: boolean;
  /** A readable fallback label taken from the last path segment, e.g. "seedance-2". */
  suggestedTitle: string;
}

export type ParseResult = { ok: true; embed: ParsedEmbed } | { ok: false; error: string };

const decode = (s: string) => s.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/g, "'");

export function parseEmbedCode(input: string): ParseResult {
  const text = input.trim();
  if (!text) return { ok: false, error: 'Paste the embed code first.' };
  let raw: string | null = null;
  if (/<iframe/i.test(text)) {
    const m = /<iframe\b[^>]*?\ssrc\s*=\s*(?:"([^"]+)"|'([^']+)')/i.exec(text);
    raw = m ? (m[1] ?? m[2]) : null;
    if (!raw) return { ok: false, error: 'I couldn’t find an iframe src in that code.' };
  } else if (/^https?:\/\/\S+$/i.test(text)) {
    raw = text;
  } else {
    return { ok: false, error: 'Paste the full embed code (starting with <iframe …) or the embed link.' };
  }
  let url: URL;
  try { url = new URL(decode(raw.trim())); } catch { return { ok: false, error: 'That embed link isn’t a valid URL.' }; }
  if (url.protocol !== 'https:') return { ok: false, error: 'Only https embeds can be added.' };
  if (url.username || url.password) return { ok: false, error: 'That embed link includes a login, which isn’t allowed.' };
  const src = url.toString();
  if (src.length > 500) return { ok: false, error: 'That embed link is too long.' };
  const last = url.pathname.split('/').filter(Boolean).pop() ?? url.hostname;
  return { ok: true, embed: { src, isAgent: url.pathname.startsWith('/embed/agent/'), suggestedTitle: last } };
}
