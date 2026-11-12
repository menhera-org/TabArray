/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
  @license
**/

import browser from 'webextension-polyfill';

import { CompatConsole } from '../../../lib/console/CompatConsole';

import type { TabActions } from './TabRow';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));

/** What a tab row does in the browser. */
export const browserTabActions: TabActions = {
  activate: (tabId) => {
    browser.tabs.update(tabId, { active: true }).catch((e) => {
      console.error('Failed to focus tab:', e);
    });
  },
  close: (tabId) => {
    browser.tabs.remove(tabId).catch((e) => {
      console.error('Failed to close tab:', e);
    });
  },
  setPinned: (tabId, pinned) => {
    browser.tabs.update(tabId, { pinned }).catch((e) => {
      console.error('Failed to pin/unpin tab:', e);
    });
  },
  showContextMenu: (tabId) => {
    browser.menus.overrideContext({ context: 'tab', tabId });
  },
  move: (tabId, index) => {
    browser.tabs.move(tabId, { index }).catch((e) => {
      console.error(e);
    });
  },
};
