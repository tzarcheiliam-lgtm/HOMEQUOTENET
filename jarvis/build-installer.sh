#!/bin/bash
# Builds Jarvis-Installer.zip (no node_modules, no settings) to copy to a Mac or the Jarvis PC.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-$PWD/Jarvis-Installer.zip}"
TMP="$(mktemp -d)"
DIR="$TMP/Jarvis Installer"
mkdir -p "$DIR"
cp -R lib jarvis.mjs package.json package-lock.json install.sh uninstall.sh README.md "Install Jarvis.command" "$DIR/"
chmod +x "$DIR/install.sh" "$DIR/uninstall.sh" "$DIR/Install Jarvis.command"
rm -f "$OUT"
( cd "$TMP" && zip -qr -X "$OUT" "Jarvis Installer" )
rm -rf "$TMP"
echo "$OUT"
