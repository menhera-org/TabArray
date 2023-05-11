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
import { CookieStore } from "weeg-containers";

import { ActiveContainerService } from "../lib/states/ActiveContainerService";
import { OpenTabsService } from "../lib/states/OpenTabsService";
import { NewTabPageService } from "../lib/tabs/NewTabPageService";
import { ContainerTabOpenerService } from "../lib/tabGroups/ContainerTabOpenerService";
import { ExtensionPageService } from "../lib/ExtensionPageService";
import { CompatConsole } from "../lib/console/CompatConsole";
import { InitialWindowsService } from "./InitialWindowsService";

import { config } from "../config/config";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const activeContainerService = ActiveContainerService.getInstance();
const openTabsService = OpenTabsService.getInstance();
const newTabPageService = NewTabPageService.getInstance();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const extensionPageService = ExtensionPageService.getInstance();
const initialWindowsService = InitialWindowsService.getInstance();

browser.tabs.onActivated.addListener(async ({tabId, windowId}) => {
  try {
    const browserTab = await browser.tabs.get(tabId);
    if (browserTab.url == 'about:blank' || browserTab.status == 'loading') {
      return;
    }
    if (null == browserTab.cookieStoreId) {
      console.warn('Incomplete tab object passed to onActivated listener', browserTab);
      return;
    }
    if (null != browserTab.url && extensionPageService.isConfirmPage(browserTab.url)) {
      console.debug('Ignoring tab activation for confirm page', browserTab);
      return;
    }
    const cookieStoreId = browserTab.cookieStoreId;
    await activeContainerService.setActiveContainer(windowId, cookieStoreId);
  } catch (e) {
    console.error(e);
  }
});

browser.tabs.onCreated.addListener(async (browserTab) => {
  try {
    if (browserTab.windowId == null || browserTab.cookieStoreId == null || browserTab.id == null) {
      return;
    }
    if (browserTab.status == 'loading') {
      return;
    }
    const windowId = browserTab.windowId;
    const cookieStoreId = browserTab.cookieStoreId;
    const [configNewTabInContainerEnabled, newTabPageUrl, activeCookieStoreId] = await Promise.all([
      config['newtab.keepContainer'].getValue(),
      newTabPageService.getNewTabPageUrl(),
      activeContainerService.getActiveContainer(windowId)
    ]);
    if (browserTab.url != 'about:blank' && browserTab.url == newTabPageUrl && configNewTabInContainerEnabled && cookieStoreId == CookieStore.DEFAULT.id && activeCookieStoreId != cookieStoreId && null != activeCookieStoreId) {
      const tabId = browserTab.id;
      await containerTabOpenerService.openNewTabInContainer(activeCookieStoreId, true, windowId);
      await browser.tabs.remove(tabId);
      return;
    }
  } catch (e) {
    console.error(e);
  }
});

browser.tabs.onUpdated.addListener(async (_tabId, _changeInfo, browserTab) => {
  try {
    if (null == browserTab.cookieStoreId || null == browserTab.windowId || null == browserTab.id) {
      console.warn('Incomplete tab object passed to onUpdated listener', browserTab);
      return;
    }
    if (browserTab.status == 'loading' || browserTab.url == 'about:blank' && browserTab.title?.includes('/')) {
      return;
    }
    const cookieStoreId = browserTab.cookieStoreId;
    const windowId = browserTab.windowId;

    const [configNewTabInContainerEnabled, newTabPageUrl, activeCookieStoreId] = await Promise.all([
      config['newtab.keepContainer'].getValue(),
      newTabPageService.getNewTabPageUrl(),
      activeContainerService.getActiveContainer(windowId)
    ]);
    if (browserTab.url == newTabPageUrl && configNewTabInContainerEnabled && cookieStoreId == CookieStore.DEFAULT.id && activeCookieStoreId != cookieStoreId && null != activeCookieStoreId) {
      const tabId = browserTab.id;
      await containerTabOpenerService.openNewTabInContainer(activeCookieStoreId, true, windowId);
      await browser.tabs.remove(tabId);
      return;
    }
    const promises: Promise<void>[] = [];
    promises.push(openTabsService.addTab(browserTab.id));
    if (browserTab.url != null && !extensionPageService.isConfirmPage(browserTab.url) && browserTab.active) {
      // console.debug('Setting active tab to:', browserTab);
      promises.push(activeContainerService.setActiveContainer(windowId, cookieStoreId));
    }
    await Promise.all(promises);
  } catch (e) {
    console.error(e);
  }
}, {
  properties: ['status', 'url'],
});

browser.windows.onRemoved.addListener(async (windowId) => {
  try {
    await activeContainerService.removeWindow(windowId);
  } catch (e) {
    console.error(e);
  }
});

browser.tabs.onRemoved.addListener(async (tabId) => {
  try {
    await openTabsService.removeTab(tabId);
  } catch (e) {
    console.error(e);
  }
});

initialWindowsService.getInitialWindows().then(async (browserWindows) => {
  try {
    const batchOperation = await activeContainerService.beginBatchOperation();
    const windowIds = browserWindows.map((browserWindow) => browserWindow.id as number);
    for (const windowId of await activeContainerService.getWindowIds()) {
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
    await Promise.all([
      openTabsService.setValue(tabIds),
      activeContainerService.commitBatchOperation(batchOperation),
    ]);
  } catch (e) {
    console.error(e);
  }
});
