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
| 1. Foundations and breakage bugs | Code done. #645 waits for the reporter to confirm the fix, and #519 needs a comment on the issue. |
| 2. Sign-in and compatibility bugs, memory leak | Code done for #139 and #396. The sign-in and desktop-app reports need their reporters to retest. |
| 3. Firefox native tab groups | Not started. Container colors already accept both the Firefox 153 and the ESR 140 names (#646), which the group color mapping needs. |
| 4. Frontend rewrite | Done. |
| 5. Settings, features and documentation | Not started. |

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
| #645 | A site reloads every 2 seconds while the extension is on. | The content script added `navigator.userAgentData` to every page, even without a user-agent override. Add it only when the override needs it, then ask the reporter to confirm. | Fixed. Ask the reporter to confirm. |
| #519 | New tabs open in the last-used container. | Works as intended: the "sticky container" setting, on by default, does this. Explain the setting on the issue. | Explain the setting on the issue. |
| #411 | Links from other apps open twice when "last active container" is set. | After reopening the link in the container, the original tab was also sent to the container picker. Reopen it once and wait for the old tab to close. | Done |

## 2. Sign-in and compatibility bugs, memory leak

Several reports may share one cause: sign-in pages and connections to desktop apps fail while the extension is on. We could not reproduce them without the sites involved, so each reporter needs to retest 12.0.0.

Until 12.0.0, the content script added `navigator.userAgentData` to every page, with no browser brands in it (#645). A page that sees `userAgentData` assumes Chrome and reads the brands. That fits #403, which failed with a script error and worked with a Chrome-based user agent in the container. The same may explain #418.

Request headers no longer pass through the extension unless a container has a language or user-agent override. Before, every request in the browser waited for the extension. We checked that the old behavior did not undo header changes made by other extensions, so that is not the cause of #412.

| Issue | Problem | Status |
|---|---|---|
| #403 | A page behind Microsoft Azure sign-in never finishes loading. | Likely fixed by #645. Ask the reporter to retest. |
| #418 | Google sign-in pop-ups stay blank. | Possibly fixed by #645. Ask the reporter to retest. |
| #552 | Windows single sign-on to ServiceNow fails. | Not an extension bug. Firefox turns Windows single sign-on off in containers. The about:config pref `network.http.windows-sso.container-enabled.<container ID>` turns it on for one container. Explain this on the issue. |
| #412 | Download managers cannot reach their desktop apps. | Not reproduced. Ask the reporter to retest. |
| #164 | 1Password cannot connect to its desktop app. | Not reproduced. Ask the reporter to retest. |

Two long-standing problems also belong here:

| Issue | Problem | Cause | Status |
|---|---|---|---|
| #139 | The extension's memory use grows until Firefox stops responding. Still confirmed in 2026. | A report showed 205,073 of the extension's messages, 879 MB, waiting for replies. The content script sent a message from every frame that nothing answered, and weeg-utils' `MessagingService` promised a reply to every message, even ones it had no handler for. | Fixed. Unanswered messages are gone, and storage statistics are sent and saved only when they change. Includes weeg-utils 0.11.1. |
| #396 | JavaScript reports the real user agent while the request header has the override. | Firefox gives a page the user agent of its request, except when a service worker serves the page. | Fixed for pages and their frames: the user agent is now also set by a content script registered for each container. Workers started by such pages still report the real user agent. |

The Chrome user-agent preset now follows Chrome's two-week release cycle, in place since Chrome 153.

## 3. Firefox native tab groups

Status: not started.

Firefox 139 added native tab groups and the `tabGroups` API. Since 12.0.0 requires Firefox 140, every desktop user has them. This phase also covers #111 (name and collapse groups in the tab bar) and the native tab groups part of #32.

The plan is to show each container as a native tab group and keep the two in sync:

- Each container that has tabs in a window gets one native group in that window. Pinned tabs and tabs with no container stay outside groups.
- The group takes the container's name and nearest color. Container colors gray (called "toolbar" before Firefox 153) and cyan ("turquoise") map to grey and cyan. Native groups have no violet, so violet maps to purple.
- Renaming or recoloring either side updates the other.
- Collapsing a group in the tab bar matches hiding the container in the extension, and the reverse.
- Sync is on by default, including for existing users after they update, and can be turned off in settings. The release notes explain how.
- The extension needs the `tabGroups` permission. Firefox does not prompt for it, so users will not see a new permission request.
- Firefox for Android has no tab groups, so sync only runs on desktop.

We will also check that Tree Style Tab still works with groups synced, the remaining part of #32.

## 4. Frontend rewrite

The extension's pages move to React 19, which the build now bundles from npm (#174). Their views were custom elements that built their DOM by hand, and every new attribute made them harder to change. Multi-select (#386) and the popup ideas in #8 are planned on top of the new frontend.

The rewrite keeps the current features and layout. Changes that users can see come from the issues in phase 5.

Status: done. Every page with a user interface, and every shared dialog, now renders with React. The index tab stays as it is because it has no user interface: it only sets its title and favicon. One small custom element remains, the menu item in the top bars, and React components wrap it. The old `src/legacy-lib` code is merged into `src/lib`.

## 5. Settings, features and documentation

New settings start off by default, so current behavior stays the same. Each adds strings that translators need before the string freeze.

| Issue | Change | Status |
|---|---|---|
| #377 | Option to sort containers alphabetically. | Not started |
| #281 | Option to hide the tab count on the toolbar icon. | Not started |
| #482 | Option to keep containers expanded in the sidebar and hide only their tabs in the tab bar. | Not started |
| #496 | Option to show a "+" button on each container that opens a new tab. With it on, clicking the container's name focuses the container instead. Native tab groups cover much of the same need, so the option is off by default. | Not started |
| #486 | Keyboard shortcuts to collapse and expand the active container. | Not started |
| #33 | Follow the browser theme in the extension's pages. | Not started |
| #481 | Rules that pick a container from the URL when another app opens a link, with a default for links no rule matches. | Not started |
| #386 | Shift-click to select several tabs, then move or close them together. | Not started |
| #282 | Mark a single tab to stay loaded when unused tabs are freed from memory. | Not started |
| #355 | Keep container tabs across restarts, saved by the extension as well as by Firefox's session store. | Not started |
| #209 | Open bookmarks in a container, and save a container's tabs as bookmarks. | Not started |
| | Sync container groups between devices, the way containers already sync. Devices on Firefox ESR 140 and on the latest release must be able to share them. | Not started |
| #8 | The remaining popup ideas: an option to collapse the container list by default, a highlight on the active container, and arrow-key navigation. | Not started |

Documentation:

| Issue | Change | Status |
|---|---|---|
| #432 | Explain how to sort containers and how to turn off automatic tab sorting. | Not started |
| #385 | Explain how to keep a group of tabs hidden, and what the extension cannot copy between containers. | Not started |

## Not in 12.0.0

| Issue | Reason |
|---|---|
| #156, #34 | Moving to a non-persistent background page and then to Manifest V3. Firefox still supports Manifest V2. The language override content scripts block #156, and the change touches every part of the extension, so it is too risky for one release. |
| #501 | Per-container Mozilla VPN locations need changes from Mozilla. |
| #473 | Firefox's fingerprinting protection hides dark mode from websites on purpose. This is not a bug in the extension. |

## Release checklist

- Every issue above is fixed, or moved to "Not in 12.0.0" with a reason in the issue.
- `npm run build` passes, and addons-linter reports no errors.
- A build from the source tarball matches the build from Git byte for byte.
- Translations are merged from Weblate after the string freeze. Untranslated strings fall back to English.
- Release notes are written in `docs/releases/v12.0.0.md`.
