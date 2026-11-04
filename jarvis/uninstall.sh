#!/bin/bash
# Stops Jarvis and removes it. Asks before deleting your settings (they hold your keys).
set -uo pipefail
JARVIS_HOME="${JARVIS_HOME:-$HOME/.jarvis}"
LABEL="com.homequote.jarvis"

if [ "$(uname -s)" = Darwin ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1
  rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
else
  systemctl --user disable --now jarvis.service >/dev/null 2>&1
  rm -f "$HOME/.config/systemd/user/jarvis.service"
  systemctl --user daemon-reload >/dev/null 2>&1
fi
echo "Jarvis stopped and removed from startup."

read -r -p "Also delete $JARVIS_HOME (settings, keys, log)? (y/n) [n]: " yn
if [ "${yn:-n}" = y ]; then
  rm -rf "$JARVIS_HOME"
  echo "Deleted. Also revoke the Jarvis key in HomeQuote (Claude connector page) and the bot in @BotFather if you won't use them again."
else
  rm -rf "$JARVIS_HOME/app"
  echo "Kept your settings in $JARVIS_HOME."
fi
