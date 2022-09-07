# Container Tab Groups
![build](https://github.com/menhera-org/TabArray/actions/workflows/node.js.yml/badge.svg)
[![Download from addons.mozilla.org](https://img.shields.io/badge/addons.mozilla.org-Download-green)](https://addons.mozilla.org/firefox/addon/container-tab-groups/)
[![Maintainability](https://api.codeclimate.com/v1/badges/80a4d073dd8edce17391/maintainability)](https://codeclimate.com/github/menhera-org/TabArray/maintainability)

Chrome-like tab groups using isolated containers: The ultimate tab manager and groups for Firefox.

[![Extension icon](TabArray.png)](https://addons.mozilla.org/firefox/addon/container-tab-groups/)

## Features

- Requires no setup before/after installation.
- Isolated cookies/logins for each of tab groups because they are containers.
- Per-window container management.
- Automatically sorts tabs based on containers.
- Manage tabs based on the domains of websites.
- Provides you with a menu where you can do the following actions:
    - List all the tabs for a window.
    - Show/hide tabs of a container.
    - Create and delete containers as you like.
    - Switch windows.
- Enables First-Party Isolate (privacy.firstparty.isolate) by default. (Configurable.)
- Allows the user to enable fingerprinting resistance (privacy.resistFingerprinting).

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

## What's next

- Keyboard shortcuts will be implemented.

## About the project

- _TabArray_ is the code name, and _Container Tab Groups_ is the user-facing name.
- The official extension ID is `tab-array@menhera.org`. (Not an email address.)

## License

Copyright &copy; 2022 Menhera.org contributors.

Licensed under GNU GPL version 3 **or later**.
