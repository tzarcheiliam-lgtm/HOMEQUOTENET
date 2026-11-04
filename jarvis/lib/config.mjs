// Settings live in ~/.jarvis/jarvis.env (chmod 600), written by install.sh. KEY=value per line, # comments.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const JARVIS_HOME = process.env.JARVIS_HOME || join(homedir(), '.jarvis');
export const ENV_PATH = join(JARVIS_HOME, 'jarvis.env');
export const STATE_PATH = join(JARVIS_HOME, 'state.json');

export function parseEnv(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'"))) value = value.slice(1, -1);
    out[line.slice(0, eq).trim()] = value;
  }
  return out;
}

const DEFAULTS = {
  HQ_URL: 'https://homequotenet.com',
  JARVIS_MODEL: 'claude-opus-5-5',
  TIMEZONE: 'America/Los_Angeles',
  BRIEFING_TIME: '07:00',
  ACTIVE_HOURS: '7-21',
};

/** Merged settings (file, then real environment variables win) with defaults and a list of problems. */
export function loadConfig(path = ENV_PATH) {
  const file = existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {};
  const env = { ...DEFAULTS, ...file };
  for (const k of Object.keys(env)) if (process.env[k]) env[k] = process.env[k];
  for (const k of ['HQ_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'ANTHROPIC_API_KEY', 'WORKFLOW_CRON_SECRET', 'HEALTHCHECK_URL']) {
    if (process.env[k]) env[k] = process.env[k];
  }
  const [startHour, endHour] = String(env.ACTIVE_HOURS).split('-').map(Number);
  const cfg = {
    hqUrl: String(env.HQ_URL).replace(/\/+$/, ''),
    hqKey: env.HQ_KEY ?? '',
    telegramToken: env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: env.TELEGRAM_CHAT_ID ? Number(env.TELEGRAM_CHAT_ID) : null,
    anthropicKey: env.ANTHROPIC_API_KEY ?? '',
    model: env.JARVIS_MODEL,
    tz: env.TIMEZONE,
    briefingTime: env.BRIEFING_TIME,
    activeHours: { start: Number.isFinite(startHour) ? startHour : 7, end: Number.isFinite(endHour) ? endHour : 21 },
    cronSecret: env.WORKFLOW_CRON_SECRET ?? '',
    healthcheckUrl: env.HEALTHCHECK_URL ?? '',
  };
  const problems = [];
  if (!/^https:\/\//.test(cfg.hqUrl) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(cfg.hqUrl)) problems.push('HQ_URL must start with https://');
  if (!cfg.hqKey.startsWith('hq_')) problems.push('HQ_KEY is missing (make one at /app/claude-connector)');
  if (!/^\d+:[\w-]{20,}$/.test(cfg.telegramToken)) problems.push('TELEGRAM_BOT_TOKEN is missing or malformed');
  if (!cfg.chatId) problems.push('TELEGRAM_CHAT_ID is missing (run the installer again to pair your phone)');
  try { new Intl.DateTimeFormat('en-US', { timeZone: cfg.tz }); } catch { problems.push(`TIMEZONE "${cfg.tz}" is not a valid time zone`); }
  return { cfg, problems };
}

export function readState(path = STATE_PATH) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; }
}

/** Atomic write: a crash mid-write never leaves a half file. */
export function writeState(state, path = STATE_PATH) {
  mkdirSync(JARVIS_HOME, { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  renameSync(tmp, path);
}
