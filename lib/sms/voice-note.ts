/**
 * The introductory voice note (pure: wording and reply detection, no I/O).
 *
 * While the owner's voice note is on, the first text to a HomeQuote lead asks permission ("Can I send you a quick
 * voice memo here?"). A yes gets the voice note, then a short line and the visit booking link on its own (iMessage
 * shows a link alone in a message as a preview card). Anything else goes to the assistant as usual.
 */
import { finalizeOutbound, openingTemplateProblem, renderOpening } from './rules';

export const VOICE_NOTE_BUCKET = 'sms-voice-notes';
/** Longest voice note the Texting page accepts (seconds) and the largest file (bytes, matches the bucket). */
export const MAX_VOICE_SECONDS = 120;
export const MAX_VOICE_BYTES = 10 * 1024 * 1024;
/** What the Mac's afconvert can read. Browser recordings are turned into WAV before upload. */
export const VOICE_NOTE_MIME = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/x-caf'] as const;
export const VOICE_NOTE_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/x-caf': 'caf',
};

/** The first text while the voice note is on. Same fill-ins as the opening text; must include {sender}. */
export const DEFAULT_VOICE_OFFER_TEMPLATE = "Hey {first_name}, it's {sender}. Just got your {project} request. Can I send you a quick voice memo here?";
/** The line sent after the voice note, right before the link. Fill-ins: {first_name}, {sender}, {project}. */
export const DEFAULT_VOICE_LINK_TEMPLATE = 'Here’s where you can pick a time for your free in-home estimate 👇';
export const MAX_VOICE_LINK_TEMPLATE = 300;

export function voiceOfferMessage(input: { template?: string | null; firstName?: string | null; senderName: string; project?: string | null }): string {
  const t = input.template?.trim() && !openingTemplateProblem(input.template) ? input.template : DEFAULT_VOICE_OFFER_TEMPLATE;
  return renderOpening(t, input);
}

/** Why a link line can't be used, or null. No links of its own (the real link follows in its own message). */
export function voiceLinkTemplateProblem(template: string): string | null {
  const t = template.trim();
  if (!t) return null;
  if (t.length > MAX_VOICE_LINK_TEMPLATE) return `Keep the line before the link under ${MAX_VOICE_LINK_TEMPLATE} characters.`;
  if (/\b(?:https?:\/\/|www\.)/i.test(t)) return 'Leave the link out: it is added on its own right after this line.';
  const unknown = (t.match(/\{[^}]*\}/g) ?? []).filter((x) => !['{first_name}', '{sender}', '{project}'].includes(x));
  if (unknown.length) return `Unknown placeholder ${unknown[0]}. Use {first_name}, {sender}, {project}.`;
  return null;
}

export function voiceLinkLine(input: { template?: string | null; firstName?: string | null; senderName: string; project?: string | null }): string {
  const t = input.template?.trim() && !voiceLinkTemplateProblem(input.template) ? input.template.trim() : DEFAULT_VOICE_LINK_TEMPLATE;
  return finalizeOutbound(t
    .replaceAll('{first_name}', input.firstName?.trim() || 'there')
    .replaceAll('{sender}', input.senderName)
    .replaceAll('{project}', input.project?.trim() || 'project'));
}

const clean = (s: string) => s.toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const YES = new Set([
  'yes', 'y', 'ya', 'yea', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'k', 'kk', 'yes please', 'please', 'please do', 'sure thing',
  'go ahead', 'go for it', 'sounds good', 'of course', 'absolutely', 'definitely', 'send it', 'send it over', 'yes send it', 'ok send it',
  'sure send it', 'that works', 'works for me', 'for sure', 'ya sure', 'yeah sure', 'ok sure', 'okay sure', 'yes sure', 'sure go ahead', 'yeah go ahead',
  'yes go ahead', 'ok go ahead', 'yeah that works', 'yes that works', 'cool', 'perfect', 'great', 'yes thanks', 'yes thank you', 'sure thanks',
]);
const YES_EMOJI = /^(?:\s*(?:👍|👌|🙌|✅|🙏|😊|🙂|👍🏻|👍🏼|👍🏽|👍🏾|👍🏿))+\s*$/u;

/** A plain yes to "can I send you a voice memo?" (no AI needed). Anything less clear goes to the assistant. */
export function isClearYes(body: string): boolean {
  if (YES_EMOJI.test(body)) return true;
  return YES.has(clean(body));
}

/** How a voice note reads in the assistant's history and on the lead's text thread. */
export const VOICE_NOTE_HISTORY = '[sent a short voice memo introducing myself]';
