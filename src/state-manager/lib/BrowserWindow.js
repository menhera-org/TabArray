// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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
*/

import browser from 'webextension-polyfill';
import { LifecycleEventTarget } from "./LifecycleEventTarget.js";

export class BrowserWindow extends LifecycleEventTarget {
  constructor(id) {
    super();
    this.id = 0|id;
    this.tabIds = new Set;
    this.activeTabId = -1;
    this.closed = false;
    this.isNormal = true;
    this.stateManager = null;
  }

  getTabs() {
    if (!this.stateManager) {
      throw new Error('StateManager is null');
    }
    const browserTabs = [... this.tabIds]
    .filter((tabId) => this.stateManager._browserTabs.has(tabId))
    .map((tabId) => this.stateManager._browserTabs.get(tabId));
    browserTabs.sort((browserTab1, browserTab2) => browserTab1.index - browserTab2.index);
    return browserTabs;
  }

  getPinnedTabs() {
    return this.getTabs().filter((browserTab) => browserTab.pinned);
  }

  getUnpinnedTabs() {
    return this.getTabs().filter((browserTab) => !browserTab.pinned);
  }

  async focus() {
    await browser.windows.update(this.id, {
      focused: true,
    });
  }

  async close() {
    if (this.closed) {
      return;
    }
    await browser.windows.remove(this.id);
  }
}
