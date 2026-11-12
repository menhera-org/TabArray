#!/bin/sh
# Container Tab Groups
# Copyright (C) 2026 Menhera.org
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Fetches the Firefox icons and design tokens this extension uses from mozilla-firefox/firefox on
# GitHub, and prints the commit they came from.
#
# Usage: shellscripts/update-firefox-assets.sh [REF]
#   REF is a branch, tag or commit of mozilla-firefox/firefox (default: main).
#
# Icons that hold both Firefox's older Proton drawing and its Nova drawing, switched by a
# -moz-pref("browser.nova.enabled") media query that only Firefox's own UI can use, keep the Nova
# drawing only. Some icons are older copies that this script leaves as they are:
#   folder-add.svg, defaultPreview.svg and cookies.svg have no counterpart at current Firefox paths;
#   private-browsing-icon.svg is Firefox's older purple icon, shown in color, while the current one is
#   a single-color context-fill icon.
# Needs curl, awk and sed. After updating, check the extension's pages in light and dark mode.

set -eu

REPO=mozilla-firefox/firefox
REF=${1:-main}
ROOT=$(cd "$(dirname "$0")/.." && pwd)

SHA=$(curl -sSfL -H 'Accept: application/vnd.github.sha' "https://api.github.com/repos/$REPO/commits/$REF")
case $SHA in
  *[!0-9a-f]* | '') echo "Cannot resolve $REF in $REPO" >&2; exit 1 ;;
esac
[ ${#SHA} -eq 40 ] || { echo "Unexpected commit: $SHA" >&2; exit 1; }
RAW="https://raw.githubusercontent.com/$REPO/$SHA"
echo "Fetching from $REPO at commit $SHA"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

fetch() { # upstream-path output-file
  curl -sSfL -o "$2" "$RAW/$1" || { echo "Failed to fetch $1" >&2; exit 1; }
}

# Drops the Proton drawing, the <style> that switches between the two, and the Nova group's class.
# A file with one drawing only is left byte for byte as it is.
nova_only() { # file
  if ! grep -q 'browser\.nova\.enabled' "$1"; then
    cat "$1"
    return
  fi
  awk '
    /^<style>/ { buf = $0 "\n"; instyle = 1; next }
    instyle {
      buf = buf $0 "\n"
      if (/^<\/style>/) { instyle = 0; if (buf !~ /browser\.nova\.enabled/) printf "%s", buf }
      next
    }
    /^<g class="proton">/ { if (!/<\/g>/) skip = 1; next }
    skip { if (/^<\/g>/) skip = 0; next }
    /^<g class="nova">/ { print "<g>"; next }
    { print }
  ' "$1"
}

# The lines inside the drawing's <g>.
drawing() { # file (already Nova-only)
  awk '/^<\/g>/ { ing = 0 } ing { print } /^<g>/ { ing = 1 }' "$1"
}

replace_file() { # source destination: overwrite without changing the destination's permissions
  cat "$1" > "$2"
}

# Icons: our name, then the path in the Firefox repository.
ICONS_DIR="$ROOT/static/img/firefox-icons"
while read -r ours upstream; do
  [ -n "$ours" ] || continue
  fetch "$upstream" "$TMP/icon.svg"
  nova_only "$TMP/icon.svg" > "$TMP/nova.svg"
  replace_file "$TMP/nova.svg" "$ICONS_DIR/$ours"
  echo "  $ours <- $upstream"
done <<'EOF'
arrow-down.svg toolkit/themes/shared/icons/arrow-down.svg
arrow-left.svg toolkit/themes/shared/icons/arrow-left.svg
arrow-right.svg toolkit/themes/shared/icons/arrow-right.svg
arrow-up.svg toolkit/themes/shared/icons/arrow-up.svg
checkmark-circle-fill.svg toolkit/themes/shared/icons/check-filled.svg
close.svg toolkit/themes/shared/icons/close.svg
defaultFavicon.svg toolkit/themes/shared/icons/defaultFavicon.svg
delete.svg toolkit/themes/shared/icons/delete.svg
developer.svg toolkit/themes/shared/icons/developer.svg
edit.svg toolkit/themes/shared/icons/edit.svg
folder.svg toolkit/themes/shared/icons/folder.svg
help.svg toolkit/themes/shared/icons/help.svg
highlights.svg toolkit/themes/shared/icons/highlights.svg
loading.svg toolkit/themes/shared/icons/loading.svg
more.svg toolkit/themes/shared/icons/more.svg
open-in-new.svg toolkit/themes/shared/icons/open-in-new.svg
page-vertical.svg toolkit/themes/shared/icons/page-portrait.svg
performance.svg toolkit/themes/shared/icons/performance.svg
plus.svg toolkit/themes/shared/icons/plus.svg
reload.svg toolkit/themes/shared/icons/reload.svg
search.svg toolkit/themes/shared/icons/search-glass.svg
settings.svg toolkit/themes/shared/icons/settings.svg
shaft-arrow-down.svg toolkit/themes/shared/icons/shaft-arrow-down.svg
shaft-arrow-up.svg toolkit/themes/shared/icons/shaft-arrow-up.svg
extension.svg toolkit/themes/shared/extensions/extension.svg
back.svg browser/themes/shared/icons/back.svg
history.svg browser/themes/shared/icons/history.svg
menu.svg browser/themes/shared/icons/menu.svg
pin.svg browser/themes/shared/icons/pin.svg
sidebars.svg browser/themes/shared/icons/sidebar-expanded.svg
tab.svg browser/themes/shared/icons/tab.svg
top-sites.svg browser/themes/shared/icons/topsites.svg
window.svg browser/themes/shared/icons/window.svg
download.svg browser/themes/shared/downloads/downloads.svg
EOF

# The toolbar button: more.svg in the icon colors of Firefox's light and dark toolbars, because
# extension toolbar icons cannot use context-fill.
drawing "$ICONS_DIR/more.svg" > "$TMP/more-paths"
toolbar_icon() { # file color toolbar-name
  {
    echo '<!-- This Source Code Form is subject to the terms of the Mozilla Public'
    echo '   - License, v. 2.0. If a copy of the MPL was not distributed with this'
    echo '   - file, You can obtain one at http://mozilla.org/MPL/2.0/. -->'
    echo "<!-- Firefox's more.svg, in the icon color of Firefox's $3 toolbar: extension toolbar icons cannot use context-fill. -->"
    echo "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" width=\"16\" height=\"16\" fill=\"$2\">"
    cat "$TMP/more-paths"
    echo '</svg>'
  } > "$TMP/toolbar.svg"
  replace_file "$TMP/toolbar.svg" "$1"
}
toolbar_icon "$ROOT/static/img/toolbar/toolbar-icon-black.svg" '#15141a' light
toolbar_icon "$ROOT/static/img/toolbar/toolbar-icon-white.svg" '#fbfbfe' dark
echo '  toolbar/toolbar-icon-{black,white}.svg <- toolkit/themes/shared/icons/more.svg'

# Firefox's design tokens for web content, unchanged.
fetch toolkit/themes/shared/design-system/dist/web/acorn-tokens.css "$TMP/acorn-tokens.css"
replace_file "$TMP/acorn-tokens.css" "$ROOT/src/css/vendor/acorn-tokens.css"
echo '  src/css/vendor/acorn-tokens.css <- toolkit/themes/shared/design-system/dist/web/acorn-tokens.css'

# Container icons: one <g id="COLOR"> per container color, each drawing the icon in that color, so
# a page picks a color with a URL fragment (icon.svg#blue).
CONTEXTUAL_PATH=browser/components/contextualidentity/content
COLORS='blue #37adff
turquoise #00c79a
green #51cd00
yellow #ffcb00
orange #ff9f00
red #ff613d
pink #ff4bda
purple #af51f5
violet #764edd
toolbar-dark #F9F9FA
toolbar-light #0C0C0D'
color_groups=$(echo "$COLORS" | while read -r name color; do
  printf '<g id="%s" fill="%s"><use href="#icon"/></g>' "$name" "$color"
done)
curl -sSfL "https://api.github.com/repos/$REPO/contents/$CONTEXTUAL_PATH?ref=$SHA" > "$TMP/listing.json"
names=$(grep -o '"name": *"[^"]*\.svg"' "$TMP/listing.json" | sed 's/.*"\([^"]*\)"$/\1/')
[ -n "$names" ] || { echo "No container icons found in $CONTEXTUAL_PATH" >&2; exit 1; }
for name in $names; do
  fetch "$CONTEXTUAL_PATH/$name" "$TMP/icon.svg"
  nova_only "$TMP/icon.svg" > "$TMP/nova.svg"
  svg_line=$(sed -n '/^<svg /{p;q;}' "$TMP/nova.svg")
  width=$(echo "$svg_line" | sed 's/.* width="\([^"]*\)".*/\1/')
  height=$(echo "$svg_line" | sed 's/.* height="\([^"]*\)".*/\1/')
  view_box=$(echo "$svg_line" | sed 's/.* viewBox="\([^"]*\)".*/\1/')
  {
    echo '<!-- This Source Code Form is subject to the terms of the Mozilla Public'
    echo '   - License, v. 2.0. If a copy of the MPL was not distributed with this'
    echo '   - file, You can obtain one at http://mozilla.org/MPL/2.0/. -->'
    echo "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"$width\" height=\"$height\" viewBox=\"$view_box\">"
    echo '<style>'
    echo '  g:not(:target) {'
    echo '    display: none;'
    echo '  }'
    echo '</style>'
    echo '<symbol id="icon">'
    drawing "$TMP/nova.svg" | sed 's/ fill="context-fill"//g'
    echo '</symbol>'
    echo "$color_groups"
    echo '</svg>'
  } > "$TMP/contextual.svg"
  replace_file "$TMP/contextual.svg" "$ROOT/static/img/contextual-identities/$name"
  echo "  contextual-identities/$name <- $CONTEXTUAL_PATH/$name"
done

# Record the commit where the notices name it.
for file in "$ROOT/src/css/vendor/README.md" "$ROOT/static/NOTICE"; do
  sed "s/[0-9a-f]\{40\}/$SHA/g" "$file" > "$TMP/notice"
  replace_file "$TMP/notice" "$file"
done

echo "Done: Firefox commit $SHA (recorded in src/css/vendor/README.md and static/NOTICE)."
