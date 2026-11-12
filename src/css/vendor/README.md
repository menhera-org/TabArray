# Firefox design tokens

`acorn-tokens.css` is Firefox's design tokens for web content, copied unchanged from
`toolkit/themes/shared/design-system/dist/web/acorn-tokens.css` in the Firefox source at commit
`0aa10c6a675f7595961d30d2ad81c240f8ddec43` (Firefox 162 Nightly, whose tokens match the Nova design
that Firefox 160 shows by default). It is under the Mozilla Public License 2.0, as its header says.

The icons in `static/img/firefox-icons/` come from the same commit, under the same license. Where an icon
held both the older Proton drawing and the Nova one, switched by a `-moz-pref("browser.nova.enabled")`
media query that only Firefox's own UI can use, only the Nova drawing is kept.

To update, copy the file from a newer Firefox commit and check the extension's pages in light and dark
mode.
