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
import { CompatTab } from "weeg-tabs";

import { ActiveContainerService } from "../../lib/states/ActiveContainerService";
import { OpenTabsService } from "../../lib/states/OpenTabsService";
import { NewTabPageService } from "../../lib/tabs/NewTabPageService";
import { ContainerTabOpenerService } from "../../lib/tabGroups/ContainerTabOpenerService";
import { ExtensionPageService } from "../../lib/ExtensionPageService";
import { CompatConsole } from "../../lib/console/CompatConsole";

import { config } from "../../config/config";

import { loadingTabs } from "./loading-tabs";

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const activeContainerService = ActiveContainerService.getInstance();
const openTabsService = OpenTabsService.getInstance();
const newTabPageService = NewTabPageService.getInstance();
const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const extensionPageService = ExtensionPageService.getInstance();

export const setActiveContainerTab = (browserTab: browser.Tabs.Tab) => {
  if (browserTab.id == null) {
    return;
  }
  if (loadingTabs.isLoading(browserTab.id)) {
    return;
  }
  try {
    if (browserTab.url == 'about:blank' && browserTab.title?.includes('/') || browserTab.status == 'loading' || browserTab.windowId == null) {
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
    if (cookieStoreId == CookieStore.PRIVATE.id) return;
    activeContainerService.setActiveContainer(browserTab.windowId, cookieStoreId).catch((e) => {
      console.error(e);
    });
  } catch (e) {
    console.error(e);
  }
};

export const reopenNewTab = async (browserTab: browser.Tabs.Tab) => {
  try {
    if (browserTab.windowId == null || browserTab.cookieStoreId == null || browserTab.id == null) {
      return;
    }
    if (browserTab.status == 'loading' || browserTab.url == 'about:blank' && browserTab.title?.includes('/')) {
      return;
    }
    const windowId = browserTab.windowId;
    const cookieStoreId = browserTab.cookieStoreId;
    const [configNewTabInContainerEnabled, newTabPageUrl, activeCookieStoreId] = await Promise.all([
      config['newtab.keepContainer'].getValue(),
      newTabPageService.getNewTabPageUrl(),
      activeContainerService.getActiveContainer(windowId)
    ]);
    if (browserTab.openerTabId == null && browserTab.url == newTabPageUrl && configNewTabInContainerEnabled && cookieStoreId == CookieStore.DEFAULT.id && activeCookieStoreId != cookieStoreId && null != activeCookieStoreId) {
      const tabId = browserTab.id;
      await browser.tabs.remove(tabId);
      await containerTabOpenerService.openNewTabInContainer(activeCookieStoreId, true, windowId);
    } else {
      const tab = new CompatTab(browserTab);
      loadingTabs.notifyLoadFinished(tab);
    }
  } catch (e) {
    console.error(e);
  }
};

export const handleTabUrlUpdate = (browserTab: browser.Tabs.Tab) => {
  if (null == browserTab.cookieStoreId || null == browserTab.windowId || null == browserTab.id) {
    console.warn('Incomplete tab object passed to onUpdated listener', browserTab);
    return;
  }
  if (browserTab.status == 'loading' || browserTab.url == 'about:blank' && browserTab.title?.includes('/')) {
    return;
  }
  const cookieStoreId = browserTab.cookieStoreId;
  const windowId = browserTab.windowId;
  const tabId = browserTab.id;

  Promise.all([
    config['newtab.keepContainer'].getValue(),
    newTabPageService.getNewTabPageUrl(),
    activeContainerService.getActiveContainer(windowId)
  ]).then(([configNewTabInContainerEnabled, newTabPageUrl, activeCookieStoreId]) => {
    if (browserTab.openerTabId == null && browserTab.url == newTabPageUrl && configNewTabInContainerEnabled && cookieStoreId == CookieStore.DEFAULT.id && activeCookieStoreId != cookieStoreId && null != activeCookieStoreId) {
      return containerTabOpenerService.openNewTabInContainer(activeCookieStoreId, true, windowId).then(() => {
        return browser.tabs.remove(tabId);
      });
    }

    // because no more processing is needed
    loadingTabs.notifyTabDisappeared(tabId);

    const promises: Promise<void>[] = [];
    promises.push(openTabsService.addTab(tabId));
    if (browserTab.url != null && !extensionPageService.isConfirmPage(browserTab.url) && browserTab.active && cookieStoreId != CookieStore.PRIVATE.id) {
      // console.debug('Setting active tab to:', browserTab);
      promises.push(activeContainerService.setActiveContainer(windowId, cookieStoreId));
    }
    return Promise.all(promises).then(() => {
      // nothing.
    });
  }).catch((e) => {
    console.error(e);
  });
};

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
