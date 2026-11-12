# Firefox design tokens

`acorn-tokens.css` is Firefox's design tokens for web content, copied unchanged from
`toolkit/themes/shared/design-system/dist/web/acorn-tokens.css` in the Firefox source at commit
`0aa10c6a675f7595961d30d2ad81c240f8ddec43` (Firefox 162 Nightly, whose tokens match the Nova design
that Firefox 160 shows by default). It is under the Mozilla Public License 2.0, as its header says.

The icons in `static/img/firefox-icons/` come from the same commit, under the same license. Where an icon
held both the older Proton drawing and the Nova one, switched by a `-moz-pref("browser.nova.enabled")`
media query that only Firefox's own UI can use, only the Nova drawing is kept. Four icons are older
copies that updates leave alone: `folder-add.svg`, `defaultPreview.svg` and `cookies.svg` have no
counterpart at current Firefox paths, and `private-browsing-icon.svg` is Firefox's older purple icon,
which the pages show in color.

The toolbar button's icons in `static/img/toolbar/` are `more.svg` from the same commit, filled with the
icon colors of Firefox's light and dark toolbars, because extension toolbar icons cannot use `context-fill`.

To update, run `shellscripts/update-firefox-assets.sh` (or `make icons`), optionally with a branch, tag or
commit of `mozilla-firefox/firefox` (default: `main`). It refetches the tokens and icons above, rebuilds the
container icons in `static/img/contextual-identities/` from the same commit, prints the commit, and records
it here and in `static/NOTICE`. Then update the Firefox version named above, and check the extension's
pages in light and dark mode.
