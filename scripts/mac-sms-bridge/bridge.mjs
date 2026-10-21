#!/usr/bin/env node
/**
 * HomeQuote Mac text bridge. Runs on the Mac that is signed into iMessage.
 *
 *  - Every few seconds asks the web app for texts to send and sends them through the Messages app.
 *  - Reads new incoming texts from the Messages database and hands them to the web app.
 *
 * No dependencies: Node 18+, plus macOS's own `osascript` and `sqlite3`.
 * Config comes from environment variables (see README.md):
 *   HQN_URL            e.g. https://www.homequote.net
 *   SMS_BRIDGE_TOKEN   the same long secret set in Vercel
 *   BRIDGE_SMS_FALLBACK=true  (optional) fall back to SMS via a paired iPhone when the number is not on iMessage
 *   BRIDGE_DRY_RUN=true       (optional) print what would be sent, send nothing
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);
const BASE = (process.env.HQN_URL ?? '').replace(/\/+$/, '');
const TOKEN = process.env.SMS_BRIDGE_TOKEN ?? '';
const DRY = process.env.BRIDGE_DRY_RUN === 'true';
const SMS_FALLBACK = process.env.BRIDGE_SMS_FALLBACK === 'true';
const CHAT_DB = process.env.CHAT_DB ?? join(homedir(), 'Library', 'Messages', 'chat.db');
const STATE_DIR = join(homedir(), '.homequote-sms-bridge');
const STATE_FILE = join(STATE_DIR, 'state.json');
const POLL_MS = 4000;
const APPLE_EPOCH_MS = Date.UTC(2001, 0, 1);

if (!BASE || TOKEN.length < 24) {
  console.error('Set HQN_URL and SMS_BRIDGE_TOKEN (24+ characters) first. See README.md.');
  process.exit(1);
}

const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, body) {
  const res = await fetch(`${BASE}/api/sms/bridge/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

// ---- sending ---------------------------------------------------------------------------------------------------
// The text and number are passed as arguments (never spliced into the script), so message content can't inject code.
const SEND_SCRIPT = `
on run argv
  set theNumber to item 1 of argv
  set theText to item 2 of argv
  set theKind to item 3 of argv
  tell application "Messages"
    if theKind is "imessage" then
      set theService to 1st account whose service type = iMessage
    else
      set theService to 1st account whose service type = SMS
    end if
    set theBuddy to participant theNumber of theService
    send theText to theBuddy
  end tell
end run`;

async function sendVia(kind, number, text) {
  await run('osascript', ['-e', SEND_SCRIPT, number, text, kind], { timeout: 30_000 });
}
async function sendText(number, text) {
  if (DRY) { log('[dry run] would send to', number, JSON.stringify(text)); return; }
  try { await sendVia('imessage', number, text); }
  catch (e) {
    if (!SMS_FALLBACK) throw e;
    log('iMessage failed, trying SMS fallback');
    await sendVia('sms', number, text);
  }
}

async function sendOutbound() {
  const { messages } = await api('pull');
  for (const m of messages) {
    try {
      await sendText(m.phone_e164, m.body);
      await api('ack', { id: m.id, ok: true });
      log('sent', m.id);
    } catch (e) {
      const msg = String(e?.stderr || e?.message || e).split('\n')[0].slice(0, 280);
      await api('ack', { id: m.id, ok: false, error: msg }).catch(() => {});
      log('FAILED', m.id, msg);
    }
    // Human pace: a few seconds between texts, never a burst.
    await sleep(3000 + Math.floor(Math.random() * 5000));
  }
}

// ---- receiving -------------------------------------------------------------------------------------------------
async function loadState() { try { return JSON.parse(await readFile(STATE_FILE, 'utf8')); } catch { return null; } }
async function saveState(s) { await mkdir(STATE_DIR, { recursive: true }); await writeFile(STATE_FILE, JSON.stringify(s)); }
async function query(sql) {
  const { stdout } = await run('sqlite3', ['-readonly', '-json', CHAT_DB, sql], { maxBuffer: 20 * 1024 * 1024 });
  return stdout.trim() ? JSON.parse(stdout) : [];
}

/** macOS 13+ often leaves `text` empty and stores the words inside the `attributedBody` blob. */
function textFromBlob(hex) {
  if (!hex) return '';
  const buf = Buffer.from(hex, 'hex');
  const marker = buf.indexOf('NSString');
  if (marker < 0) return '';
  let i = marker + 'NSString'.length;
  while (i < buf.length && buf[i] !== 0x2b) i++; // '+' precedes the length-prefixed string
  i++;
  if (i >= buf.length) return '';
  let len = buf[i++];
  if (len === 0x81) { len = buf.readUInt16LE(i); i += 2; }
  else if (len === 0x82) { len = buf.readUInt32LE(i); i += 4; }
  return buf.subarray(i, i + len).toString('utf8');
}

async function receiveInbound() {
  let state = await loadState();
  if (!state) {
    // First run: start from now. Old conversations are never replayed to the app.
    const [row] = await query('select coalesce(max(ROWID),0) as m from message');
    state = { lastRowId: Number(row?.m ?? 0) };
    await saveState(state);
    log('first run: starting after message', state.lastRowId);
    return;
  }
  const rows = await query(
    `select m.ROWID as rowid, m.guid, m.text, hex(m.attributedBody) as body_hex, m.date, h.id as handle
       from message m join handle h on h.ROWID = m.handle_id
      where m.ROWID > ${Number(state.lastRowId)} and m.is_from_me = 0
      order by m.ROWID limit 50`);
  for (const r of rows) {
    const text = (r.text || textFromBlob(r.body_hex) || '').trim();
    if (text && /^\+?\d{10,15}$/.test(String(r.handle).replace(/[^\d+]/g, ''))) {
      const ms = APPLE_EPOCH_MS + (Number(r.date) > 1e12 ? Number(r.date) / 1e6 : Number(r.date) * 1000);
      if (!DRY) await api('inbound', { phone: r.handle, body: text, guid: r.guid, receivedAt: new Date(ms).toISOString() });
      log('received from', String(r.handle).slice(-4));
    }
    state.lastRowId = r.rowid;
    await saveState(state); // advance only after the app has the message, so a failure retries it
  }
}

// ---- loop ------------------------------------------------------------------------------------------------------
log('HomeQuote text bridge started', DRY ? '(dry run)' : '');
for (;;) {
  try { await receiveInbound(); } catch (e) { log('receive error:', String(e.message ?? e).split('\n')[0]); }
  try { await sendOutbound(); } catch (e) { log('send error:', String(e.message ?? e).split('\n')[0]); }
  await sleep(POLL_MS);
}
