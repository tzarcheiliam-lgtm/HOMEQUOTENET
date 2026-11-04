#!/usr/bin/env node
// Jarvis: an always-on helper for HomeQuote. Runs as a background service (launchd on macOS, systemd on Linux).
//
//   node jarvis.mjs          run the service
//   node jarvis.mjs --check  test every connection and exit
//   node jarvis.mjs --pair   wait for /start from your phone and print the chat id (used by install.sh)
//   node jarvis.mjs --hello  send a test message
//
// What it does (all read-only toward HomeQuote and customers):
//   - Telegram alerts when a lead is waiting for a person (right away, after 1 h, after 4 h) and when a HomeQuote
//     automation or the Mac texting bridge breaks, then again when it recovers. Lead alerts wait outside active hours.
//   - A 7 am briefing (time configurable), written by Claude when ANTHROPIC_API_KEY is set, else a plain template.
//   - Commands from your phone: /status /waiting /today /brief, and plain questions answered from live data.
//   - Optional: a backup call to the HomeQuote scheduler every 5 minutes, and a Healthchecks.io heartbeat.
import { hostname } from 'node:os';
import { ask, writeBriefing } from './lib/brain.mjs';
import { ENV_PATH, loadConfig, readState, writeState } from './lib/config.mjs';
import { planHandoffAlerts, planHealthAlerts, seedHandoffs } from './lib/alerts.mjs';
import { clip, formatStatus, formatToday, formatWaiting, handoffAlert, shortName, templateBriefing } from './lib/format.mjs';
import { homequote } from './lib/homequote.mjs';
import { ago, briefingDue, clockTime, localParts, todayRange, withinActiveHours } from './lib/schedule.mjs';
import { telegram } from './lib/telegram.mjs';

const POLL_MS = 5 * 60_000;
const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { cfg, problems } = loadConfig();
const mode = process.argv[2] ?? '';

const HELP = `Jarvis here. Commands:
/status – texting bridge + anything broken
/waiting – leads waiting for a person
/today – today's appointments
/brief – the morning briefing, now
Or just ask, e.g. "how many leads came in this week?"

I can read HomeQuote, not change it: texts, bookings and edits stay in the app.`;

// ------------------------------------------------------------------ one-shot modes
if (mode === '--pair') await pair();
else if (mode === '--check') await check();
else if (mode === '--hello') {
  requireConfig();
  await telegram({ token: cfg.telegramToken }).send(cfg.chatId, `👋 Test message from Jarvis on ${hostname()}.`);
  log('sent');
} else if (mode) {
  console.error(`Unknown option ${mode}. Use --check, --pair or --hello.`);
  process.exit(2);
} else {
  requireConfig();
  await run();
}

function requireConfig() {
  if (problems.length) {
    console.error(`Jarvis is not configured (${ENV_PATH}):\n - ${problems.join('\n - ')}`);
    process.exit(1);
  }
}

async function pair() {
  if (!cfg.telegramToken) { console.error('TELEGRAM_BOT_TOKEN is not set'); process.exit(1); }
  const tg = telegram({ token: cfg.telegramToken });
  const me = await tg.getMe();
  await tg.api('deleteWebhook', {}).catch(() => {});
  console.error(`Open Telegram, find @${me.username}, and send it:  /start`);
  // Skip anything sent before now, then wait up to 5 minutes for a private /start.
  let offset = 0;
  const old = await tg.getUpdates(0, 0);
  if (old.length) offset = old[old.length - 1].update_id + 1;
  const until = Date.now() + 5 * 60_000;
  while (Date.now() < until) {
    for (const u of await tg.getUpdates(offset, 30)) {
      offset = u.update_id + 1;
      const m = u.message;
      if (m?.chat?.type === 'private' && /^\/start\b/.test(m.text ?? '')) {
        await tg.getUpdates(offset, 0); // confirm, so the service doesn't see this /start again
        await tg.send(m.chat.id, `✅ Paired with Jarvis on ${hostname()}. Only this chat can talk to me.`);
        console.log(`CHAT_ID=${m.chat.id}`);
        process.exit(0);
      }
    }
  }
  console.error('No /start received within 5 minutes.');
  process.exit(1);
}

async function check() {
  let ok = true;
  const line = (good, text) => { console.log(`${good ? '✓' : '✗'} ${text}`); if (!good) ok = false; };
  for (const p of problems) line(false, p);
  if (cfg.hqKey) {
    try {
      const tools = await homequote({ url: cfg.hqUrl, key: cfg.hqKey }).listTools();
      line(tools.includes('texting_overview'), `HomeQuote connector reachable at ${cfg.hqUrl} (${tools.length} tools)`);
      const writes = tools.filter((t) => ['send_text', 'update_lead_status', 'add_lead_note', 'propose_lead_assignment', 'propose_appointment', 'create_workflow_draft'].includes(t));
      if (writes.length) console.log(`! This key can also change things (${writes.join(', ')}). Jarvis only reads; a read-only key is safer.`);
    } catch (e) { line(false, `HomeQuote: ${e.message}`); }
  }
  if (cfg.telegramToken) {
    try { const me = await telegram({ token: cfg.telegramToken }).getMe(); line(true, `Telegram bot @${me.username}`); } catch (e) { line(false, e.message); }
  }
  if (cfg.anthropicKey) {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      await new Anthropic({ apiKey: cfg.anthropicKey }).models.retrieve(cfg.model);
      line(true, `Claude (${cfg.model})`);
    } catch (e) { line(false, `Claude: ${e.message}`); }
  } else console.log('- Claude: not set (questions off; briefing uses the plain template)');
  if (cfg.cronSecret) {
    const r = await fetch(`${cfg.hqUrl}/api/workflows/tick`, { method: 'POST', headers: { Authorization: `Bearer ${cfg.cronSecret}` }, signal: AbortSignal.timeout(90_000) }).catch((e) => ({ status: e.message }));
    line(r.status === 200 || r.status === 207, `Backup scheduler call: ${r.status}`);
  } else console.log('- Backup scheduler: not set');
  console.log(cfg.healthcheckUrl ? '- Healthchecks heartbeat: set' : '- Healthchecks heartbeat: not set');
  process.exit(ok ? 0 : 1);
}

// ------------------------------------------------------------------ service
async function run() {
  const hq = homequote({ url: cfg.hqUrl, key: cfg.hqKey });
  const tg = telegram({ token: cfg.telegramToken });
  const state = readState();
  const save = () => { try { writeState(state); } catch (e) { log('state not saved:', e.message); } };
  const send = async (text) => { try { await tg.send(cfg.chatId, text); } catch (e) { log('telegram send failed:', e.message); } };
  const active = (now) => withinActiveHours(now, cfg.tz, cfg.activeHours.start, cfg.activeHours.end);
  let stopping = false;

  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopping = true; save(); log('stopping'); process.exit(0); });
  log(`Jarvis started on ${hostname()} (HomeQuote ${cfg.hqUrl}, briefing ${cfg.briefingTime} ${cfg.tz})`);
  if (!state.lastOnlineAt || Date.now() - new Date(state.lastOnlineAt).getTime() > 6 * 3600_000) {
    await send(`🟢 Jarvis is online on ${hostname()}. Send /help for commands.`);
  }
  state.lastOnlineAt = new Date().toISOString();
  save();

  async function poll() {
    const now = new Date();
    if (cfg.cronSecret) {
      try {
        const r = await fetch(`${cfg.hqUrl}/api/workflows/tick`, { method: 'POST', headers: { Authorization: `Bearer ${cfg.cronSecret}` }, signal: AbortSignal.timeout(90_000) });
        if (r.status !== 200 && r.status !== 207) log('backup tick: HTTP', r.status);
      } catch (e) { log('backup tick failed:', e.message); }
    }
    let texting; let attention;
    try {
      texting = await hq.call('texting_overview');
      attention = (await hq.call('list_automations', { state: 'attention' }))?.automations ?? [];
      if (state.hqDownSince && active(now)) await send(`✅ HomeQuote is reachable again (was down ${ago(state.hqDownSince, now)}).`);
      state.hqDownSince = null; state.hqFailures = 0;
    } catch (e) {
      state.hqFailures = (state.hqFailures ?? 0) + 1;
      log('homequote poll failed:', e.message);
      if (state.hqFailures === 3) { state.hqDownSince = now.toISOString(); if (active(now)) await send(`⚠️ Jarvis can't reach HomeQuote for 15 minutes: ${clip(e.message, 160)}`); }
      if (cfg.healthcheckUrl) fetch(`${cfg.healthcheckUrl}/fail`, { signal: AbortSignal.timeout(10_000) }).catch(() => {});
      save();
      return;
    }
    if (cfg.healthcheckUrl) fetch(cfg.healthcheckUrl, { signal: AbortSignal.timeout(10_000) }).catch(() => {});

    const items = texting?.need_a_person ?? [];
    if (!state.handoffs) {
      // First run: one combined message, not a burst.
      state.handoffs = seedHandoffs(items, now);
      if (items.length && active(now)) await send(formatWaiting(items, now));
    } else {
      const { send: due, next } = planHandoffAlerts(state.handoffs, items, now, active(now));
      for (const { item, nth } of due) await send(handoffAlert(item, nth, now));
      state.handoffs = next;
    }
    if (active(now)) {
      const { bad, recovered, next } = planHealthAlerts(state.health ?? {}, attention, texting);
      for (const b of bad) await send(`⚠️ ${b.key === 'mac_bridge' ? 'Mac texting bridge' : b.key}: ${clip(b.note, 200)}`);
      for (const k of recovered) await send(`✅ Back to normal: ${k === 'mac_bridge' ? 'Mac texting bridge' : k}`);
      state.health = next;
    }
    save();
  }

  async function briefingText(now) {
    const { from, to } = todayRange(now, cfg.tz);
    const [summary, texting, appointments, automations] = await Promise.all([
      hq.call('business_summary', { days: 1 }).catch(() => null),
      hq.call('texting_overview').catch(() => null),
      hq.call('list_appointments', { from: from.toISOString(), to: to.toISOString() }).catch(() => []),
      hq.call('list_automations', { state: 'attention' }).catch(() => null),
    ]);
    const attention = automations?.automations ?? [];
    const appts = Array.isArray(appointments) ? appointments : [];
    if (cfg.anthropicKey) {
      try {
        return await writeBriefing(cfg, {
          today: localParts(now, cfg.tz).date,
          appointments: appts.filter((a) => a.status !== 'cancelled').map((a) => ({ time: clockTime(a.scheduled_at, cfg.tz), name: a.lead?.name ? shortName(a.lead.name) : null, city: a.lead?.city ?? null, status: a.status, contractor: a.contractor ?? null, link: a.lead?.link ?? null })),
          waiting_for_a_person: (texting?.need_a_person ?? []).map((w) => ({ name: shortName(w.lead), waiting: ago(w.since, now), summary: clip(w.summary, 220), link: w.link })),
          last_24h: summary,
          broken: [...attention.map((a) => `${a.name}: ${a.note ?? ''}`), ...(texting && !texting.mac_bridge?.connected ? ['Mac texting bridge not connected'] : [])],
        });
      } catch (e) { log('claude briefing failed, using template:', e.message); }
    }
    return templateBriefing({ summary, texting, appointments: appts, attention, tz: cfg.tz, now });
  }

  async function minute() {
    const now = new Date();
    if (!state.lastPollAt || now.getTime() - new Date(state.lastPollAt).getTime() >= POLL_MS - 5_000) {
      state.lastPollAt = now.toISOString();
      await poll();
    }
    if (briefingDue(now, cfg.tz, cfg.briefingTime, state.lastBriefingDate)) {
      try {
        await tg.send(cfg.chatId, await briefingText(now));
        state.lastBriefingDate = localParts(now, cfg.tz).date;
        save();
      } catch (e) { log('briefing failed (retrying next minute):', e.message); }
    }
  }

  async function handle(msg) {
    if (!msg?.chat) return;
    if (msg.chat.type !== 'private' || msg.chat.id !== cfg.chatId) { log('ignored a message from chat', msg.chat.id); return; }
    const text = (msg.text ?? '').trim();
    if (!text) return;
    const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@\w+$/, '');
    const now = new Date();
    log('command', cmd.startsWith('/') ? cmd : '(question)');
    try {
      if (cmd === '/start' || cmd === '/help') return await send(HELP);
      if (cmd === '/status') {
        const [texting, automations] = await Promise.all([hq.call('texting_overview'), hq.call('list_automations', { state: 'attention' })]);
        return await send(formatStatus(texting, automations?.automations ?? [], now));
      }
      if (cmd === '/waiting') return await send(formatWaiting((await hq.call('texting_overview'))?.need_a_person ?? [], now));
      if (cmd === '/today') {
        const { from, to } = todayRange(now, cfg.tz);
        return await send(formatToday(await hq.call('list_appointments', { from: from.toISOString(), to: to.toISOString() }), cfg.tz));
      }
      if (cmd === '/brief') return await send(await briefingText(now));
      if (cmd.startsWith('/')) return await send(`I don't know ${cmd}.\n\n${HELP}`);
      if (!cfg.anthropicKey) return await send('Questions need ANTHROPIC_API_KEY in Jarvis settings (run the installer again). Commands still work: /help');
      await tg.typing(cfg.chatId);
      const today = `It is ${new Intl.DateTimeFormat('en-US', { timeZone: cfg.tz, dateStyle: 'full', timeStyle: 'short' }).format(now)} (${cfg.tz}).`;
      await send(await ask(cfg, clip(text, 2000), today));
    } catch (e) {
      log('command failed:', e.message);
      await send(`Sorry, that failed: ${clip(e.message, 200)}`);
    }
  }

  // Minute loop (polls every 5 minutes inside it) and the Telegram long-poll loop run side by side.
  (async () => {
    while (!stopping) {
      try { await minute(); } catch (e) { log('loop error:', e.message); }
      await sleep(60_000 - (Date.now() % 60_000) + 500);
    }
  })();

  let offset = state.telegramOffset ?? 0;
  while (!stopping) {
    try {
      const updates = await tg.getUpdates(offset, 50);
      for (const u of updates) {
        offset = u.update_id + 1;
        state.telegramOffset = offset;
        save(); // before handling, so a crash never replays a command
        await handle(u.message);
      }
    } catch (e) {
      if (/Conflict/i.test(e.message)) log('another Jarvis is using this bot token (only one machine can run it at a time)');
      else log('telegram poll:', e.message);
      await sleep(e.retryAfter ? e.retryAfter * 1000 : 10_000);
    }
  }
}
