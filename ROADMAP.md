# Roadmap

This roadmap covers Container Tab Groups 12.0.0, which ships as soon as it is ready and no later than 31 December 2026. It lists the open issues we plan to fix, the order we plan to work in, and the issues we will not fix in this release.

Version 12.0.0 replaces both old milestones. The "Version 12.0.0" milestone was due in August 2024, and most of "Version 13.0.0" is now in reach, so we plan to ship every issue we can fix as one release.

## Schedule

We will release 12.0.0 on addons.mozilla.org (AMO) as soon as the work below is done, and no later than 31 December 2026. The five phases are in priority order, not on a calendar. Phases 2 to 4 touch different parts of the code, so they can run in parallel once phase 1 is done. The popup and sidebar items in phase 5 build on the rewrite in phase 4.

Strings freeze one week before the release, so translators on Weblate have time to catch up.

Mozilla's new add-on policies take effect on 1 December 2026. Whichever version AMO reviews 12.0.0 under, we will submit the source tarball made by `npm run package-source`, which AMO can rebuild with `npm run build-for-amo`.

## Status

Last updated 12 November 2026. "Done" means the change is on `main` and ships in 12.0.0.

| Phase | Status |
|---|---|
| 1. Foundations and breakage bugs | Done. Every issue is closed; the #645 reporter is asked to retest 12.0.0 and reopen if needed. |
| 2. Sign-in and compatibility bugs, memory leak | Done. Every issue is closed; the sign-in and desktop-app reporters are asked to retest 12.0.0 and reopen if needed. |
| 3. Firefox native tab groups | Done. Tested in Firefox 140 and 159, also with Tree Style Tab. Tags are removed. |
| 4. Frontend rewrite | Done. |
| 5. Settings, features and documentation | Done. #355 is folded into #209, and #33 moved to phase 6. Group sync is unit-tested but not tested between two real devices. |
| 6. Visual design refresh | Done, with #33. Checked in Firefox 159 in light and dark mode and with a colored theme. |

## 1. Foundations and breakage bugs

These changes are done:

- Firefox 140 or later is required (Firefox for Android 142).
- The manifest declares that the extension collects no data (`data_collection_permissions`). AMO requires this for new extensions and will require it for updates.
- React 19 is bundled from npm instead of copied into the repository.
- Builds are reproducible from a source tarball as well as from Git.
- On Firefox 153 and later, registrable domains come from Firefox's `publicSuffix` API instead of a downloaded copy of the public suffix list.

Bugs that can lose tabs or break the UI come first:

| Issue | Problem | Plan | Status |
|---|---|---|---|
| #508 | The sidebar's close button closes Firefox. | The button closes the selected window, which quits Firefox when it is the last one. Ask for confirmation first. | Done |
| #646 | "Edit container" does nothing for containers without an icon, and new icons are not saved. | Firefox 153 renamed the container colors toolbar and turquoise to gray and cyan, and added violet. Accept both sets of names, so ESR 140 and the latest release both work, including container sync between them. | Done |
| #645 | A site reloads every 2 seconds while the extension is on. | The content script added `navigator.userAgentData` to every page, even without a user-agent override. Add it only when the override needs it, then ask the reporter to confirm. | Fixed. Closed; the reporter is asked to retest 12.0.0. |
| #519 | New tabs open in the last-used container. | Works as intended: the "sticky container" setting, on by default, does this. Explain the setting on the issue. | Done. The setting is explained on the issue, which is closed. |
| #411 | Links from other apps open twice when "last active container" is set. | After reopening the link in the container, the original tab was also sent to the container picker. Reopen it once and wait for the old tab to close. | Done |

## 2. Sign-in and compatibility bugs, memory leak

Several reports may share one cause: sign-in pages and connections to desktop apps fail while the extension is on. We could not reproduce them without the sites involved, so each reporter needs to retest 12.0.0.

Until 12.0.0, the content script added `navigator.userAgentData` to every page, with no browser brands in it (#645). A page that sees `userAgentData` assumes Chrome and reads the brands. That fits #403, which failed with a script error and worked with a Chrome-based user agent in the container. The same may explain #418.

Request headers no longer pass through the extension unless a container has a language or user-agent override. Before, every request in the browser waited for the extension. We checked that the old behavior did not undo header changes made by other extensions, so that is not the cause of #412.

| Issue | Problem | Status |
|---|---|---|
| #403 | A page behind Microsoft Azure sign-in never finishes loading. | Likely fixed by #645. Closed; the reporter is asked to retest 12.0.0. |
| #418 | Google sign-in pop-ups stay blank. | Possibly fixed by #645. Closed; the reporter is asked to retest 12.0.0. |
| #552 | Windows single sign-on to ServiceNow fails. | Done. Not an extension bug: Firefox turns single sign-on off in containers. `docs/single-sign-on.md` explains how to turn it on for one container. The issue is closed. |
| #412 | Download managers cannot reach their desktop apps. | Not reproduced. Closed; the reporter is asked to retest 12.0.0. |
| #164 | 1Password cannot connect to its desktop app. | Not reproduced. Closed; the reporter is asked to retest 12.0.0. |

Two long-standing problems also belong here:

| Issue | Problem | Cause | Status |
|---|---|---|---|
| #139 | The extension's memory use grows until Firefox stops responding. Still confirmed in 2026. | A report showed 205,073 of the extension's messages, 879 MB, waiting for replies. The content script sent a message from every frame that nothing answered, and weeg-utils' `MessagingService` promised a reply to every message, even ones it had no handler for. | Fixed. Unanswered messages are gone, and storage statistics are sent and saved only when they change. Includes weeg-utils 0.11.1. Closed. |
| #396 | JavaScript reports the real user agent while the request header has the override. | Firefox gives a page the user agent of its request, except when a service worker serves the page. | Fixed for pages and their frames: the user agent is now also set by a content script registered for each container. Workers started by such pages still report the real user agent. Closed. |

The Chrome user-agent preset now follows Chrome's two-week release cycle, in place since Chrome 153.

## 3. Firefox native tab groups

Status: done.

Firefox 139 added native tab groups and the `tabGroups` API. Since 12.0.0 requires Firefox 140, every desktop user has them. This phase also covers #111 (name and collapse groups in the tab bar) and the native tab groups part of #32.

The plan is to show each container as a native tab group and keep the two in sync:

- Each container that has tabs in a window gets one native group in that window. Pinned tabs and tabs with no container stay outside groups. Container groups (supergroups) have no native equivalent, since native groups cannot nest.
- The extension owns every group that holds container tabs. A tab dragged out of its container's group goes back, a tab with no container dropped into a group is moved out, and a group the user makes by hand around container tabs is split into one group per container.
- Each container's tabs are kept together while sync is on, even with automatic sorting turned off. Turning sorting off then only stops the extension from ordering the containers.
- The group takes the container's name and nearest color. Container colors gray (called "toolbar" before Firefox 153) and cyan ("turquoise") map to grey and cyan. Native groups have no violet, so violet maps to purple, and a violet container stays violet while its group is purple.
- Renaming or recoloring either side updates the other.
- Hiding a container collapses its group instead of hiding its tabs, and expanding the group in the tab bar shows the container again. Firefox keeps the active tab visible in a collapsed group, and collapsed tabs stay in Ctrl+Tab. Containers that are hidden when sync starts are shown and collapsed instead.
- Index tabs are not created while sync is on, and existing ones are closed. The option still works with sync off.
- Turning sync off ungroups the container groups and hides the tabs of collapsed ones, so what was out of sight stays out of sight.
- Sync is on by default, including for existing users after they update, and can be turned off in settings. The release notes explain how.
- The extension needs the `tabGroups` permission. Firefox does not prompt for it, so users will not see a new permission request.
- Firefox for Android has no tab groups, so sync only runs on desktop.

What we measured in Firefox 140 and 159, which behave the same:

- Group IDs can change across restarts, so groups are matched to containers by their tabs, never by stored IDs.
- Group membership follows tab position: moving a tab out of a group's range removes it, moving it back adds it, and a new tab created inside the range joins the group.
- Hidden tabs can be grouped and stay grouped. A group whose tabs are all hidden keeps its label in the tab bar.
- Collapsing a group does not mark its tabs hidden.
- The `tabGroups` events fire for creation and for title, color and collapse changes.

Work, in order:

1. A planner that takes one window's tabs, groups and containers and returns the changes needed (group, ungroup, retitle, recolor). It has no side effects, so unit tests cover the rules above.
2. A sync service that runs the planner per window after tab, group and container events, and after sorting, debounced and without reacting to its own changes.
3. Group changes made in the tab bar flow back: title and color to the container, collapse to the container's hidden state.
4. Hiding and showing containers, auto-hide and the popup's hidden state use the group's collapsed state while sync is on.
5. The setting, its strings before the string freeze, the permission, and release notes.
6. Firefox tests on 140 and the latest release: grouping as tabs open, both directions of rename and recolor, collapse and hide, dragged tabs, hand-made groups, sorting off, and turning sync off.

All six are done. Firefox 140 and 159 passed the same tests. Two more checks passed in Firefox 159:

- Turning sync on closes index tabs without closing the tabs of their containers.
- Tree Style Tab 4.4.9 works with groups synced, the remaining part of #32: a tree of tabs stays in its container's group, and the two extensions do not keep moving tabs.

Found on the way and fixed: with index tabs set to "always", the extension created several index tabs per container (13 for 5 containers in a test). A new index tab fired tab events before it was registered, and those events created another one; concurrent registrations also overwrote each other. Index tabs are now created through one guarded path, and registrations are written one at a time. The same test now gives one index tab per container, also after more tabs open.

### Tags removed

Status: done.

Tags sorted and labeled tabs inside a container. With containers shown as tab groups, which cannot nest, tags could only exist in the popup, with nothing matching them in the tab bar. Containers and their groups cover the same need, so 12.0.0 drops tags to keep one way of grouping tabs:

- The popup no longer has tag headings, the "New tag" button, or the set-tag button on tabs. Search no longer matches tag names.
- Tabs keep their order inside a container instead of being sorted by tag.
- Updating to 12.0.0 deletes the saved tags and the tag stored with each open tab.
- The release notes say so, since users who used tags lose them.

## 4. Frontend rewrite

The extension's pages move to React 19, which the build now bundles from npm (#174). Their views were custom elements that built their DOM by hand, and every new attribute made them harder to change. Multi-select (#386) and the popup ideas in #8 are planned on top of the new frontend.

The rewrite keeps the current features and layout. Changes that users can see come from the issues in phase 5.

Status: done. Every page with a user interface, and every shared dialog, now renders with React. The index tab stays as it is because it has no user interface: it only sets its title and favicon. One small custom element remains, the menu item in the top bars, and React components wrap it. The old `src/legacy-lib` code is merged into `src/lib`.

## 5. Settings, features and documentation

New settings start off by default, so current behavior stays the same. Each adds strings that translators need before the string freeze.

#377, #482 and #8 were re-scoped on 12 November 2026 for containers shown as tab groups, and #496 moved to "Not in 12.0.0".

| Issue | Change | Status |
|---|---|---|
| #377 | Option to sort containers by name within each container group. The popup, the sidebar, tab sorting and the order of tab groups in the tab bar all follow it. | Done |
| #281 | Option to hide the tab count on the toolbar icon. | Done |
| #482 | Option to keep listing a container's tabs in the sidebar while its tab group is collapsed, so collapsing only affects the tab bar. | Done |
| #486 | Keyboard shortcuts to collapse and expand the active container. | Done. No keys are set by default; users assign them in Firefox's Manage Extension Shortcuts. |
| #33 | Follow the browser theme in the extension's pages. | Moved to Phase 6, and done there. |
| #481 | Rules that pick a container from the URL when another app opens a link, with a default for links no rule matches. | Done: a **Sites from other apps** column on the Sort Containers tab; a site covers its subdomains and the most specific one wins. The existing "When an external application opens a tab" option is the default. |
| #386 | Shift-click to select several tabs, then move or close them together. | Done in the popup and the sidebar: Shift-, Ctrl- or Cmd-click selects; closing or dropping a selected tab on a container acts on the whole selection. |
| #282 | Mark a single tab to stay loaded when unused tabs are freed from memory. | Done: "Keep This Tab Loaded" in the tab context menu. It also stops Firefox from freeing the tab when memory is low. |
| #355 | Folded into #209. Firefox already restores container tabs with "Open previous windows and tabs"; the request for a backup outside the session store is covered by saving a container's tabs as bookmarks. | Closed |
| #209 | Open bookmarks in a container, and save a container's tabs as bookmarks that reopen in the same container. This also serves as a backup of a container's tabs outside the session store (#355). The `bookmarks` permission is optional, so Firefox asks for it only when someone first uses these features. | Done: **Save Tabs as Bookmarks** in a container's options, and **Open in Container** on bookmarks and folders while the permission is granted. |
| | Sync container groups between devices, the way containers already sync. Devices on Firefox ESR 140 and on the latest release must be able to share them. | Done, with "Sync Containers": each group syncs on its own, members by synced IDs. Unit-tested; not tested between two real devices. |
| #8 | The remaining popup ideas: a highlight on the active container, and arrow-key navigation. Collapsing the container list by default is dropped, since with sync on it would collapse the groups in the tab bar too. | Done. Arrow keys already moved between rows, search results included; the container of the active tab is now highlighted. |

Documentation:

| Issue | Change | Status |
|---|---|---|
| #432 | Explain how to sort containers and how to turn off automatic tab sorting. | Done: `docs/organizing-tabs.md` |
| #385 | Explain how to keep a group of tabs hidden, and what the extension cannot copy between containers. | Done: `docs/organizing-tabs.md` |

## 6. Visual design refresh

Refresh extension UI styles (update DOM when needed)
to match the latest Firefox's chrome look & feel, and
make it feel like modern, without any visual glitches.
For this, we can copy mozilla-central's icons and CSS files into this repo, with license notices intact.

This includes #33: the extension's pages use the colors of the current Firefox theme, not only its light or dark mode.

Done:

- Firefox's design tokens for web content (`src/css/vendor/acorn-tokens.css`, MPL-2.0) and its icons, both from the Nova design that Firefox 160 shows by default. The pages follow Firefox's accent color, and the extension's own green is gone.
- Every page uses the tokens: Firefox's buttons, selects, fields and checkboxes, panel-style lists in the popup, the sidebar and the address bar panel, cards on the full pages, and Firefox's dialogs. The deprecated `browser_style` stylesheet is no longer used.
- #33: the popup, the sidebar and the address bar panel take their background, text and accent colors from the current theme, and switch between light and dark with it.
- Pages set `lang` and `dir` from the extension's active locale.
- The build targets Firefox only: `webextension-polyfill`, a shim for Chrome, is replaced by Firefox's own `browser`, and CSS is no longer rewritten for other browsers.

## Not in 12.0.0

| Issue | Reason |
|---|---|
| #156, #34 | Moving to a non-persistent background page and then to Manifest V3. Firefox still supports Manifest V2. The language override content scripts block #156, and the change touches every part of the extension, so it is too risky for one release. |
| #501 | Per-container Mozilla VPN locations need changes from Mozilla. |
| #473 | Firefox's fingerprinting protection hides dark mode from websites on purpose. This is not a bug in the extension. |
| #496 | A "+" button on each container to open a new tab. Firefox's tab group menu already opens a new tab in a group, and 12.0.0 keeps fewer ways of doing the same thing. |

## Release checklist

- Every issue above is fixed, or moved to "Not in 12.0.0" with a reason in the issue.
- `npm run build` passes, and addons-linter reports no errors.
- A build from the source tarball matches the build from Git byte for byte.
- Translations are merged from Weblate after the string freeze. Untranslated strings fall back to English.
- Release notes are written in `docs/releases/v12.0.0.md`.
