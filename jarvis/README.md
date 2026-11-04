# Jarvis

An always-on helper for HomeQuote that lives on your phone (Telegram) and runs on a Mac now, the Jarvis PC later.
It **only reads** HomeQuote: texts to customers, bookings and edits stay in the app.

What you get:
- **Alerts** when a lead is waiting for a person: right away, again after 1 hour and after 4 hours, until someone
  handles it. Alerts wait outside 7 am–9 pm and show up in the briefing instead.
- **Alerts** when a HomeQuote automation breaks or the Mac texting bridge disconnects, and when it's back.
- **A 7 am briefing**: today's appointments, who's waiting, yesterday's numbers, what's broken, your top 3.
- **Commands**: `/status` `/waiting` `/today` `/brief`, or ask a question in plain English
  ("how many Meta leads this week?"). Questions need a Claude API key.
- Optional: a backup call to the HomeQuote scheduler every 5 minutes, and a Healthchecks.io heartbeat.

## Before you start (5 minutes, on your phone or computer)
1. **HomeQuote key**: HomeQuote → Claude connector (`/app/claude-connector`) → new key, permission **read** only,
   name it "Jarvis". Copy it (it starts with `hq_` and is shown once).
2. **Telegram bot**: in Telegram, message **@BotFather** → `/newbot` → a name ("HomeQuote Jarvis") and a username
   ending in `bot`. Copy the token it sends.
3. Optional **Claude API key** from https://platform.claude.com/settings/keys. Set a monthly spend limit there
   ($25 is plenty; normal use is a few dollars a month).

## Install on a Mac
1. Unzip **Jarvis-Installer.zip** on your Desktop.
2. Open **Terminal** and run:
   `bash ~/Desktop/"Jarvis Installer"/install.sh`
   (Or double-click **Install Jarvis.command**. If macOS blocks it, open System Settings → Privacy & Security and
   click "Open Anyway", or just use the Terminal line.)
3. Paste the keys when asked, then send `/start` to your bot when it tells you to. Jarvis messages you within a minute.

The Mac must stay awake (it already must, for the texting bridge): System Settings → Energy → turn on
"Prevent automatic sleeping when the display is off".

## Install on the Jarvis PC (Ubuntu)
Copy the same zip over, then in a terminal:
`unzip Jarvis-Installer.zip && bash "Jarvis Installer/install.sh"`

It installs Node if needed (via snap), and sets Jarvis to start at boot. **Only one computer can run the same bot**:
when you move to the PC, uninstall it on the Mac first (or make a second bot).

## Everyday
- Change settings: run the installer again (it keeps the app up to date too).
- Log: `~/.jarvis/jarvis.log`
- Restart: Mac `launchctl kickstart -k gui/$(id -u)/com.homequote.jarvis` · PC `systemctl --user restart jarvis`
- Uninstall: `bash ~/.jarvis/app/uninstall.sh`

## Safety
- Jarvis answers only the one Telegram chat you paired; everyone else is ignored.
- Settings (keys) are in `~/.jarvis/jarvis.env`, readable only by your user. Lost the computer? Revoke the
  HomeQuote key on the Claude connector page and the bot token with @BotFather.
- Telegram isn't end-to-end encrypted, so messages show first name + last initial and a HomeQuote link (which needs
  your login), not phone numbers.
- Questions go to Claude with your **read-only** HomeQuote key, limited to read tools; lead texts are treated as data.

## For developers
Plain Node ESM (Node 20.12+), one dependency (`@anthropic-ai/sdk`). Pure logic in `lib/schedule.mjs`,
`lib/alerts.mjs`, `lib/format.mjs` is tested in `tests/jarvis.test.ts` (repo root). Build the zip with
`bash jarvis/build-installer.sh`. `JARVIS_NO_SERVICE=1` skips registering the service; `TELEGRAM_API_BASE` and an
`http://127.0.0.1` `HQ_URL` exist only for local tests against fakes.
