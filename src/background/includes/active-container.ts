/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2023 Menhera.org

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

import browser from "webextension-polyfill";

import { ActiveContainerService } from "../../lib/states/ActiveContainerService";
import { OpenTabsService } from "../../lib/states/OpenTabsService";
import { CompatConsole } from "../../lib/console/CompatConsole";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const activeContainerService = ActiveContainerService.getInstance();
const openTabsService = OpenTabsService.getInstance();

export const doBatchOperationOnInitialWindows = (browserWindows: browser.Windows.Window[]) => {
  activeContainerService.beginBatchOperation().then((batchOperation) => {
    const windowIds = browserWindows.map((browserWindow) => browserWindow.id as number);
    for (const windowId of batchOperation.getWindowIds()) {
      if (!windowIds.includes(windowId)) {
        batchOperation.removeWindow(windowId);
      }
    }
    const openBrowserTabs: browser.Tabs.Tab[] = [];
    for (const browserWindow of browserWindows) {
      if (!browserWindow.tabs || null == browserWindow.id) continue;
      openBrowserTabs.push(...browserWindow.tabs);
      const windowId = browserWindow.id;
      for (const browserTab of browserWindow.tabs) {
        if (!browserTab.active) continue;
        if (!browserTab.cookieStoreId) continue;
        const cookieStoreId = browserTab.cookieStoreId;
        batchOperation.setActiveContainer(windowId, cookieStoreId);
        break;
      }
    }
    const tabIds = openBrowserTabs.map((browserTab) => browserTab.id as number);
    return Promise.all([
      openTabsService.setValue(tabIds),
      activeContainerService.commitBatchOperation(batchOperation),
    ]);
  }).catch((e) => {
    console.error(e);
  });
};
