#!/bin/bash
# Double-click this on a Mac to install or update Jarvis. (On Linux run: bash install.sh)
cd "$(dirname "$0")" || exit 1
bash ./install.sh
status=$?
echo
read -r -n 1 -p "Press any key to close this window..."
exit $status
