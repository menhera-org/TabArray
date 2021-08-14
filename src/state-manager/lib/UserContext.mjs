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

import { LifecycleEventTarget } from "./LifecycleEventTarget.mjs";

// UserContext
const CLASS_ID = 'f06149ff-6503-4d9b-88fe-196ea5b64b5c';

const COLORS = [
  "blue",
  "turquoise",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "toolbar",
];

const ICONS = [
  "fingerprint",
  "briefcase",
  "dollar",
  "cart",
  "circle",
  "gift",
  "vacation",
  "food",
  "fruit",
  "pet",
  "tree",
  "chill",
  "fence",
];

const DEFAULT_ICON_URL = browser.runtime.getURL('/img/category_black_24dp.svg');

export class UserContext extends LifecycleEventTarget {
  id = 0;
  name = '';
  colorName = 'toolbar';
  iconName = 'circle';
  colorCode = '#7c7c7d';
  iconUrl = DEFAULT_ICON_URL;
  isDefined = true;
  tabIds = new Set;
  stateManager = null;

  constructor(id) {
    super();
    this.id = 0|id;
  }

  get CLASS_ID() {
    return CLASS_ID;
  }

  getBrowserTabs() {
    const browserTabs = [... this.tabIds]
    .map((tabId) => this.stateManager.getBrowserTab(tabId));
    browserTabs.sort((browserTab1, browserTab2) => {
      if (browserTab1.windowId == browserTab2.windowId) {
        return browserTab1.index - browserTab2.index;
      }
      return browserTab1.windowId - browserTab2.windowId;
    });
    return browserTabs;
  }

  get cookieStoreId() {
    return UserContext.toCookieStoreId(this.id);
  }

  async close() {
    //
  }

  static [Symbol.hasInstance](obj) {
    return obj && obj.CLASS_ID == CLASS_ID;
  }

  static toCookieStoreId(aUserContextId) {
    const userContextId = Math.max(0, 0 | aUserContextId);
    if (userContextId) {
      return 'firefox-container-' + userContextId;
    } else {
      return 'firefox-default';
    }
  }

  static toUserContextId(aCookieStoreId) {
    if ('number' == typeof aCookieStoreId) {
      return Math.max(0, 0 | aCookieStoreId);
    }
    const matches = String(aCookieStoreId || '').match(/^firefox-container-([0-9]+)$/);
    if (!matches) {
      return 0;
    } else {
      return 0 | matches[1];
    }
  }
}
