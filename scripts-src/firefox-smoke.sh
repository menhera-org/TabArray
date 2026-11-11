#!/bin/sh
# Runs inside the Firefox container started by scripts/firefox-smoke.js.
# Loads /ext as a temporary add-on, opens $PAGE, optionally runs /out/run.json, and writes artifacts to /out.
# Needs only sh, curl and sed.
set -eu
UUID=$EXTENSION_UUID
WD=http://127.0.0.1:4444
# --allow-system-access lets us use the chrome context below.
geckodriver --host 127.0.0.1 --port 4444 --allow-system-access > /out/firefox.log 2>&1 &
i=0
until curl -s "$WD/status" > /dev/null; do
  i=$((i + 1))
  [ "$i" -lt 50 ] || { echo 'geckodriver did not start' >&2; exit 1; }
  sleep 0.2
done

resp=$(curl -s -X POST "$WD/session" -H 'Content-Type: application/json' -d @/out/session.json)
sid=$(printf '%s' "$resp" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
[ -n "$sid" ] || { echo "Could not start Firefox: $resp" >&2; exit 1; }

post() {
  curl -s -X POST "$WD/session/$sid/$1" -H 'Content-Type: application/json' -d "$2" > /dev/null
}

open_page() {
  # WebDriver refuses to navigate to moz-extension:// URLs, so load the page from the chrome context.
  post moz/context '{"context":"chrome"}'
  post execute/sync @/out/navigate.json
  post moz/context '{"context":"content"}'
  sleep "$PAGE_WAIT"
}

post moz/addon/install '{"path":"/ext","temporary":true}'
sleep "$BOOT_WAIT"
open_page
# Prepare storage and test data, then load the page again so it starts from that state.
post execute/async @/out/setup.json
open_page
if [ -f /out/run.json ]; then
  post execute/sync @/out/run.json
  sleep "$PAGE_WAIT"
fi
curl -s "$WD/session/$sid/screenshot" > /out/screenshot.json
curl -s -X POST "$WD/session/$sid/execute/sync" -H 'Content-Type: application/json' \
  -d '{"script":"return document.documentElement.outerHTML","args":[]}' > /out/dom.json
curl -s -X DELETE "$WD/session/$sid" > /dev/null
