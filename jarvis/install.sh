#!/bin/bash
# Jarvis installer for macOS and Linux (Ubuntu). Safe to run again: it updates the app and keeps your settings
# unless you choose to change them.
#
#   bash install.sh
#
# Installs to ~/.jarvis (app, settings, log) and starts Jarvis as a background service that comes back after a
# restart: launchd on macOS, a systemd user service on Linux.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
JARVIS_HOME="${JARVIS_HOME:-$HOME/.jarvis}"
APP="$JARVIS_HOME/app"
ENV_FILE="$JARVIS_HOME/jarvis.env"
LOG="$JARVIS_HOME/jarvis.log"
LABEL="com.homequote.jarvis"
OS="$(uname -s)"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die() { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
ask() { # ask VAR "Question" "default"
  local answer
  if [ -n "${3:-}" ]; then read -r -p "  $2 [$3]: " answer; else read -r -p "  $2: " answer; fi
  printf -v "$1" '%s' "${answer:-${3:-}}"
}
ask_secret() { # ask_secret VAR "Question" (input hidden; empty keeps the current value)
  local answer
  read -r -s -p "  $2: " answer; echo
  printf -v "$1" '%s' "$answer"
}
current() { [ -f "$ENV_FILE" ] && grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true; }

bold "Jarvis installer"
case "$OS" in
  Darwin) ok "macOS $(sw_vers -productVersion 2>/dev/null || true)" ;;
  Linux) ok "Linux $(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME")" ;;
  *) die "Unsupported system: $OS (macOS or Linux only)" ;;
esac

# ------------------------------------------------------------------ 1. Node.js 20.12+
node_ok() { command -v node >/dev/null 2>&1 && node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>20||(a===20&&b>=12)?0:1)'; }
if ! node_ok; then
  warn "Node.js 20.12 or newer is needed."
  if [ "$OS" = Darwin ] && command -v brew >/dev/null 2>&1; then
    ask yn "Install it with Homebrew now? (y/n)" "y"
    [ "$yn" = y ] && brew install node
  elif [ "$OS" = Linux ] && command -v snap >/dev/null 2>&1; then
    ask yn "Install Node 22 with snap now (needs your password)? (y/n)" "y"
    [ "$yn" = y ] && sudo snap install node --classic --channel=22
  fi
  hash -r
  node_ok || die "Install Node.js LTS from https://nodejs.org, then run this installer again."
fi
NODE="$(command -v node)"
ok "Node $(node -v) at $NODE"

# ------------------------------------------------------------------ 2. Copy the app
mkdir -p "$APP"
chmod 700 "$JARVIS_HOME"
if [ "$SRC" != "$APP" ]; then # re-running ~/.jarvis/app/install.sh just reconfigures
  for f in jarvis.mjs package.json package-lock.json README.md install.sh uninstall.sh; do
    if [ -f "$SRC/$f" ]; then cp "$SRC/$f" "$APP/"; fi
  done
  rm -rf "$APP/lib" && cp -R "$SRC/lib" "$APP/lib"
fi
( cd "$APP" && npm ci --omit=dev --no-audit --no-fund --loglevel=error >/dev/null 2>&1 || npm install --omit=dev --no-audit --no-fund --loglevel=error >/dev/null ) || die "npm install failed (check your internet connection)."
ok "App installed in $APP"

# ------------------------------------------------------------------ 3. Settings
configure=y
if [ -f "$ENV_FILE" ]; then
  ask configure "Settings already exist. Change them? (y/n)" "n"
fi
if [ "$configure" = y ]; then
  echo
  bold "Settings (press Enter to keep the value in [brackets]; hidden fields keep the current value if left empty)"
  ask HQ_URL "HomeQuote address" "$(current HQ_URL || true)"
  HQ_URL="${HQ_URL:-https://homequotenet.com}"
  echo "  HomeQuote key: in HomeQuote open $HQ_URL/app/claude-connector, create a key with ONLY 'read'"
  echo "  permission, name it 'Jarvis', and paste it here (starts with hq_)."
  ask_secret HQ_KEY "HomeQuote key"
  HQ_KEY="${HQ_KEY:-$(current HQ_KEY)}"
  case "$HQ_KEY" in hq_*) ;; *) die "That doesn't look like a HomeQuote key (it starts with hq_)." ;; esac

  echo
  echo "  Telegram bot: in Telegram, message @BotFather, send /newbot, pick a name (e.g. 'HomeQuote Jarvis')"
  echo "  and a username ending in 'bot'. It replies with a token like 123456:ABC-..."
  ask_secret TELEGRAM_BOT_TOKEN "Bot token"
  TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(current TELEGRAM_BOT_TOKEN)}"
  [ -n "$TELEGRAM_BOT_TOKEN" ] || die "A Telegram bot token is required."

  echo
  echo "  Claude API key (optional; lets you ask questions and makes the briefing smarter)."
  echo "  From https://platform.claude.com/settings/keys — set a monthly spend limit there too."
  echo "  It starts with sk-ant-. Enter keeps the saved one; type none to remove it."
  ask_secret ANTHROPIC_API_KEY "Claude API key (Enter to skip)"
  ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-$(current ANTHROPIC_API_KEY)}"
  [ "$ANTHROPIC_API_KEY" = none ] && ANTHROPIC_API_KEY=""
  case "$ANTHROPIC_API_KEY" in ""|sk-ant-*) ;; *) warn "That doesn't look like a Claude API key (they start with sk-ant-). Saving it anyway." ;; esac

  echo
  echo "  Backup scheduler (optional): the WORKFLOW_CRON_SECRET from Vercel. Jarvis then also calls the HomeQuote"
  echo "  scheduler every 5 minutes, as a backup to Supabase Cron. Skip if you don't have it."
  ask_secret WORKFLOW_CRON_SECRET "Scheduler secret (Enter to skip, none to remove)"
  WORKFLOW_CRON_SECRET="${WORKFLOW_CRON_SECRET:-$(current WORKFLOW_CRON_SECRET)}"
  [ "$WORKFLOW_CRON_SECRET" = none ] && WORKFLOW_CRON_SECRET=""

  echo
  echo "  Heartbeat (optional): a free https://healthchecks.io check URL, so you hear about it if this computer dies."
  ask HEALTHCHECK_URL "Healthchecks URL (Enter to skip)" "$(current HEALTHCHECK_URL || true)"

  ask BRIEFING_TIME "Morning briefing time, e.g. 7AM or 09:00" "$(current BRIEFING_TIME || true)"
  BRIEFING_TIME="${BRIEFING_TIME:-07:00}"
  ask TIMEZONE "Time zone (PST, or a name like America/Los_Angeles)" "$(current TIMEZONE || true)"
  TIMEZONE="${TIMEZONE:-America/Los_Angeles}"

  # Pair your phone: Jarvis only ever talks to this one chat.
  echo
  bold "Pair your phone"
  CHAT_ID="$(current TELEGRAM_CHAT_ID || true)"
  redo=y
  [ -n "$CHAT_ID" ] && ask redo "Already paired with chat $CHAT_ID. Pair again? (y/n)" "n"
  if [ "$redo" = y ]; then
    # A running Jarvis would take the /start message, so pause it while pairing.
    if [ "$OS" = Darwin ]; then launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true; else systemctl --user stop jarvis.service >/dev/null 2>&1 || true; fi
    out="$(TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" JARVIS_HOME="$JARVIS_HOME" "$NODE" "$APP/jarvis.mjs" --pair)" || die "Pairing failed. Check the bot token and run the installer again."
    CHAT_ID="$(printf '%s\n' "$out" | sed -n 's/^CHAT_ID=//p' | tail -n1)"
    [ -n "$CHAT_ID" ] || die "Pairing failed."
    ok "Paired with chat $CHAT_ID"
  fi

  umask 077
  {
    echo "# Jarvis settings. Keep private: this file holds keys. Edit, then restart Jarvis (see README)."
    echo "HQ_URL=$HQ_URL"
    echo "HQ_KEY=$HQ_KEY"
    echo "TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN"
    echo "TELEGRAM_CHAT_ID=$CHAT_ID"
    echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
    echo "JARVIS_MODEL=$(current JARVIS_MODEL || true)"
    echo "WORKFLOW_CRON_SECRET=$WORKFLOW_CRON_SECRET"
    echo "HEALTHCHECK_URL=$HEALTHCHECK_URL"
    echo "BRIEFING_TIME=$BRIEFING_TIME"
    echo "TIMEZONE=$TIMEZONE"
    echo "ACTIVE_HOURS=$(current ACTIVE_HOURS || true)"
  } > "$ENV_FILE.new"
  # Empty optional lines fall back to defaults; drop them so the file stays readable.
  grep -v -E '^(JARVIS_MODEL|ACTIVE_HOURS|ANTHROPIC_API_KEY|WORKFLOW_CRON_SECRET|HEALTHCHECK_URL)=$' "$ENV_FILE.new" > "$ENV_FILE"
  rm -f "$ENV_FILE.new"
  chmod 600 "$ENV_FILE"
  ok "Settings saved to $ENV_FILE (only you can read it)"
fi

# ------------------------------------------------------------------ 4. Test the connections
echo
bold "Checking connections"
JARVIS_HOME="$JARVIS_HOME" "$NODE" "$APP/jarvis.mjs" --check || die "Fix the item marked ✗ above, then run the installer again."

# ------------------------------------------------------------------ 5. Start on boot
echo
bold "Starting Jarvis"
if [ -n "${JARVIS_NO_SERVICE:-}" ]; then
  warn "JARVIS_NO_SERVICE is set: not registering a background service. Run: JARVIS_HOME=$JARVIS_HOME $NODE $APP/jarvis.mjs"
elif [ "$OS" = Darwin ]; then
  PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$NODE</string><string>$APP/jarvis.mjs</string></array>
  <key>WorkingDirectory</key><string>$APP</string>
  <key>EnvironmentVariables</key>
  <dict><key>JARVIS_HOME</key><string>$JARVIS_HOME</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST
  launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
  sleep 1
  # bootstrap can fail with "Input/output error" right after a bootout; retry, then fall back to the older load.
  launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || { sleep 2; launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null; } \
    || launchctl load -w "$PLIST" || die "macOS refused to start the Jarvis service (launchctl). Paste this message to Claude."
  launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
  sleep 5
  if launchctl print "gui/$(id -u)/$LABEL" 2>/dev/null | grep -q "state = running"; then
    ok "Running (launchd: $LABEL). It starts again when you log in."
  else
    warn "Jarvis did not stay running. Last lines of its log:"
    tail -15 "$LOG" 2>/dev/null | sed 's/^/    /'
    die "Jarvis is installed but not running. Paste the lines above to Claude."
  fi
  if [ "$(pmset -g 2>/dev/null | awk '/ sleep /{print $2; exit}')" != "0" ]; then
    warn "This Mac may go to sleep, which pauses Jarvis (and the texting bridge)."
    warn "System Settings → Energy (or Battery → Options): turn on 'Prevent automatic sleeping when the display is off'."
  fi
else
  UNIT_DIR="$HOME/.config/systemd/user"
  mkdir -p "$UNIT_DIR"
  cat > "$UNIT_DIR/jarvis.service" <<UNIT
[Unit]
Description=Jarvis (HomeQuote operations helper)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=$NODE $APP/jarvis.mjs
WorkingDirectory=$APP
Environment=JARVIS_HOME=$JARVIS_HOME
Restart=always
RestartSec=15
StandardOutput=append:$LOG
StandardError=append:$LOG

[Install]
WantedBy=default.target
UNIT
  systemctl --user daemon-reload
  systemctl --user enable --now jarvis.service
  systemctl --user restart jarvis.service
  sleep 5
  if systemctl --user is-active --quiet jarvis.service; then
    ok "Running (systemd user service: jarvis)."
  else
    warn "Jarvis did not stay running. Last lines of its log:"
    tail -15 "$LOG" 2>/dev/null | sed 's/^/    /'
    die "Jarvis is installed but not running. Paste the lines above to Claude."
  fi
  if [ "$(loginctl show-user "$USER" -p Linger --value 2>/dev/null || echo no)" != "yes" ]; then
    if loginctl enable-linger "$USER" 2>/dev/null || sudo loginctl enable-linger "$USER"; then
      ok "Starts at boot, even before you log in."
    else
      warn "Run 'sudo loginctl enable-linger $USER' so Jarvis starts at boot without logging in."
    fi
  fi
fi

echo
bold "Done. Jarvis should message you on Telegram within a minute."
echo "  Log:        $LOG"
echo "  Settings:   $ENV_FILE  (change them by running this installer again)"
if [ "$OS" = Darwin ]; then
  echo "  Restart:    launchctl kickstart -k gui/\$(id -u)/$LABEL"
else
  echo "  Restart:    systemctl --user restart jarvis"
fi
echo "  Uninstall:  bash $APP/uninstall.sh"
