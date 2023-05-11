# Container Tab Groups

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/menhera-org/TabArray/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/menhera-org/TabArray/tree/main)
[![Downloads](https://img.shields.io/amo/dw/tab-array@menhera.org)](https://addons.mozilla.org/firefox/addon/container-tab-groups/)
[![Users](https://img.shields.io/amo/users/tab-array@menhera.org)](https://addons.mozilla.org/firefox/addon/container-tab-groups/)
[![Made in TypeScript](https://img.shields.io/badge/Made%20in-TypeScript-%233178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/github/license/menhera-org/TabArray)](https://www.gnu.org/licenses/gpl-3.0.en.html)
[![Maintainability](https://api.codeclimate.com/v1/badges/80a4d073dd8edce17391/maintainability)](https://codeclimate.com/github/menhera-org/TabArray/maintainability)
[![Translation status](https://hosted.weblate.org/widgets/container-tab-groups/-/svg-badge.svg)](https://hosted.weblate.org/engage/container-tab-groups/)

Chrome-like tab groups using private and isolated containers: The ultimate tab manager and groups for Firefox.

[![Extension icon](TabArray.png)](https://addons.mozilla.org/firefox/addon/container-tab-groups/)  
[Download for Firefox](https://addons.mozilla.org/firefox/addon/container-tab-groups/)

[Latest unsigned builds from CI](https://downloads.menhera.org/ctg/) (To download builds from this site, please right-click and save to prevent errors when Firefox tries to "install" downloads.)

[About Container Tab Groups](https://www.menhera.org/container-tab-groups/)

![Screenshot](./social-image.png)

[![CircleCI](https://dl.circleci.com/insights-snapshot/gh/menhera-org/TabArray/main/build/badge.svg?window=30d)](https://app.circleci.com/insights/github/menhera-org/TabArray/workflows/build/overview?branch=main&reporting-window=last-30-days&insights-snapshot=true)

## Features

_Tab Group = Container_

- Requires no setup before/after installation.
- Isolated cookies/logins for each of tab groups because they are containers.
- Per-window container management.
- Temporary containers and auto-cookie-discarding containers.
- Automatically sorts tabs based on containers.
- Manage tabs based on the domains of websites.
- Provides you with a menu where you can do the following actions:
    - List all the tabs for a window.
    - Show/hide tabs of a container.
    - Create and delete containers as you like.
    - Switch windows.
- Enables First-Party Isolate (privacy.firstparty.isolate; FPI) by default. (Configurable.) **This means that cookies for different sites, even for a same container, are separated by registrable domain.** It also enables natural and flicker-free openings of new windows by websites, unlike simulated FPI by manipulating containers. This is the way Tor Browser is using.
- Allows the user to enable fingerprinting resistance (privacy.resistFingerprinting).
- Per-container overrides of the language and the user agent settings.

## Usage

The button to open the main controls is by default added at the tab bar at the top, as shown below. The button has three dots.

![screenshot](tab-button.png)

1. Before starting a task, create a new container for it!
2. Open tabs related to the task in that container.
3. When finished, delete the container to remove all the clutters.

## Intention

This extension is designed to be the best tab group extension/addon for Firefox.

This extension is intended to replace the following features/extensions:

- Conex, an extension which is not updated recently.
- Google Chrome's tab groups.

## Known bugs

- View source (view-source: URLs) on No Container does not work. This is the limitation of WebExtensions API.

## Compatiblity

### Compatible

- Firefox Multi-Account Containers
- Facebook Container
- Temporary Containers
- Tab Session Manager
- Most extensions that changes the New Tab page.

Probably more compatible extensions...

### Incompatible

- Tree Style Tab
- Simple Tab Groups (?)
- Many other tab management extensions? (#32)

### Compatibility To Do's

- Improve the compatibility with top 10 popular tab management extensions, for example
- Export the APIs to work nicely with Tree Style Tab
- Make this extension compatible with Simple Tab Groups, or make this extension feature-rich
enough to unnecessitate Simple Tab Groups.

## What's next

- Keyboard shortcuts will be implemented. → The first implementation is available.

## Available languages

- English
- 日本語
- Français
- Esperanto
- Español
- Русский
- Deutsch
- Čeština
- Galego
- Interlingua
- 中文 (简体)
- Português (do Brasil)

This project uses Hosted Weblate for translation. You can contribute translations at Hosted Weblate.

[![Translation status](https://hosted.weblate.org/widgets/container-tab-groups/-/messages-json/multi-auto.svg)](https://hosted.weblate.org/engage/container-tab-groups/)

[Translate to your language](https://hosted.weblate.org/engage/container-tab-groups/)

### Translation Managers

- metastable-void (ja, eo, ia)
- 佐々木Alex🐇 (Sasaki Alex🐇) (fr, es-ES, ru)

## About the project

- _TabArray_ is the code name, and _Container Tab Groups_ is the user-facing name.
- The official extension ID is `tab-array@menhera.org`. (Not an email address.)
- To contact the developers, use [Google Groups](https://groups.google.com/a/menhera.com/g/ctg-l) or [GitHub discussions](https://github.com/menhera-org/TabArray/discussions).

### Version scheme

We use the following version scheme:

```
major.minor.maintenance.build
```

We make releases when first three version numbers change. The build version (fourth part) is purely informational.

For example, we just call 11.8.1.200 release 11.8.1.

#### Build version

Versions ending with .1xx are development versions, and versions ending with .2xx are release versions.

The two digits after 1 or 2 indicate patch level.


## FAQs

### Will this be available for Chrome?

This extension depends on many technologies not available in Chrome (only in Firefox),
where the most important is Firefox's isolated containers feature.
So it would not be possible.

### When will (feature) be released?

See the [issues](https://github.com/menhera-org/TabArray/issues).
Something missing you need? Please file a new feature request there.

## Building the extension

1. Install the latest Node.JS/NPM using [NVM](https://github.com/nvm-sh/nvm).
2. In this directory, run `npm install`.
3. Run `npm run build` for production builds, and `npm run dev` for development builds.

## License

Copyright &copy; 2022 Menhera.org contributors.

Licensed under GNU GPL version 3 **or later**.

### Used assets

- Material Icons (Apache-2.0)
- Icons from mozilla-central (MPL-2.0)
- SVG Spinners (MIT)
