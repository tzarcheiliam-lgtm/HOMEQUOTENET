# HomeQuote Mac text bridge

Sends the automatic texts to new leads from your Mac's Messages app (blue iMessage bubbles) and passes their replies to the app's AI assistant.

## Requirements
- A Mac that stays **on, awake and online** (System Settings → Lock Screen / Energy: prevent sleep when plugged in).
- Messages signed in to iMessage with a **dedicated Apple ID / number** for HomeQuote (not your personal one).
- Node 18+ (`node -v`). `osascript` and `sqlite3` already ship with macOS.

## 1. Set the secret (once)
Make a long random secret (`openssl rand -hex 32`) and add it in Vercel as `SMS_BRIDGE_TOKEN`, then redeploy.
(`ANTHROPIC_API_KEY` must already be set — the AI replies use it. Optional `SMS_MODEL`, default `claude-haiku-5-5`.)

## 2. Give the Mac permissions (once)
1. System Settings → Privacy & Security → **Full Disk Access** → add **Terminal** (or whatever runs the bridge). This lets it read incoming texts.
2. The first send asks to let Terminal control **Messages** → Allow. (Privacy & Security → Automation.)

## 3. Test without sending anything
```
export HQN_URL=https://YOUR-SITE (the same as NEXT_PUBLIC_SITE_URL)
export SMS_BRIDGE_TOKEN=<the same secret>
BRIDGE_DRY_RUN=true node scripts/mac-sms-bridge/bridge.mjs
```
It should print "started". Leave it a minute; no errors means the secret and URL are right.

## 4. Run it for real
```
node scripts/mac-sms-bridge/bridge.mjs
```
Then turn texting on at **Texting** in the app (`/app/texting`). Set `BRIDGE_SMS_FALLBACK=true` if you have an iPhone paired with Text Message Forwarding and want non-iMessage numbers to get a green SMS instead of failing.

## 5. Keep it running after restarts
Copy `com.homequote.sms-bridge.plist` to `~/Library/LaunchAgents/`, edit the three `CHANGE_ME` values, then:
```
launchctl load ~/Library/LaunchAgents/com.homequote.sms-bridge.plist
```
Logs: `/tmp/homequote-sms-bridge.log`.

## Safety built in
- Nothing is sent until an admin turns texting on; the **Stop all texting** button halts it instantly.
- Texts go out only 8am–9pm in the lead's time zone (changeable), at most the daily limit, a few seconds apart.
- Anyone who replies STOP is never texted again. The AI never quotes prices, never sends links, and hands off to a person on anything unusual.
- The bridge only ever replies to people the app texted first.
