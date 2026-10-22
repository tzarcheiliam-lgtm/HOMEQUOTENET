/**
 * Everything read from the database (lead notes, project descriptions, names, imported text) is content a
 * homeowner or third party may have written. It is handed to the model as quoted data inside a fenced block,
 * never as instructions. The system prompt says the same; this makes the boundary hard to forge.
 */
export function wrapUntrusted(value: unknown, maxChars: number): string {
  let json = JSON.stringify(value, null, 0) ?? 'null';
  // A payload cannot close our wrapper early or smuggle in its own: break "</" and "<tool_data".
  json = json.replace(/<\/?\s*tool_data/gi, '<​tool_data').replace(/<\//g, '<\\/');
  if (json.length > maxChars) json = `${json.slice(0, maxChars)}…[truncated: ask a narrower question for the rest]`;
  return `<tool_data untrusted="true">\n${json}\n</tool_data>`;
}

/** Trims a free-text field before it reaches the model. */
export function clip(value: unknown, max = 500): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
