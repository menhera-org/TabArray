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

import browser from 'webextension-polyfill';
import { Uint32 } from "weeg-types";
import { CompatTab } from 'weeg-tabs';
import { CookieStore } from 'weeg-containers';

import { TabQueryService } from '../lib/tabs/TabQueryService';
import { IndexTabService } from '../lib/tabs/IndexTabService';
import { CookieStoreTabMap } from '../lib/tabs/CookieStoreTabMap';
import { CompatConsole } from '../lib/console/CompatConsole';

import * as containers from '../legacy-lib/modules/containers';
import { IndexTab } from '../legacy-lib/modules/IndexTab';

import { config } from '../config/config';
import { InitialWindowsService } from './includes/InitialWindowsService';

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const initialWindowsService = InitialWindowsService.getInstance();
const tabQueryService = TabQueryService.getInstance();
const indexTabService = IndexTabService.getInstance();

const handleClosedIndexTab = async (tabId: number, windowId: number) => {
  const indexTabOption = await config['tab.groups.indexOption'].getValue();
  const indexTabUserContextId = await indexTabService.getIndexTabUserContextId(tabId);
  if (indexTabUserContextId != undefined) {
    await indexTabService.removeIndexTabUserContextId(tabId);
    if (indexTabOption == 'never') return;

    // index closed, close all tabs of that group
    const cookieStore = CookieStore.fromParams({
      userContextId: indexTabUserContextId,
      privateBrowsingId: 0 as Uint32,
    });
    console.log('index tab %d closed on window %d, close all tabs of that container %s', tabId, windowId, cookieStore.id);
    await containers.closeAllTabsOnWindow(cookieStore.id, windowId);
  }
};

const removeIndexTabForCookieStore = async (cookieStoreId: string) => {
  const tabs = await tabQueryService.queryTabs({ tabGroupId: cookieStoreId });
  for (const tab of tabs) {
    if (IndexTab.isIndexTabUrl(tab.url)) {
      await indexTabService.unregisterIndexTab(tab.id);
      await tab.close();
    }
  }
};

browser.tabs.onRemoved.addListener(async (tabId, {windowId, isWindowClosing}) => {
  if (isWindowClosing) {
    await indexTabService.removeIndexTabUserContextId(tabId);
    return;
  }
  handleClosedIndexTab(tabId, windowId).catch((e) => {
    console.error(e);
  });

  try {
    const tabs = (await browser.tabs.query({ windowId })).map((browserTab) => new CompatTab(browserTab));
    const cookieStoreTabMap = new CookieStoreTabMap(tabs);
    for (const cookieStoreId of cookieStoreTabMap.getCookieStoreIds()) {
      const tabs = [... cookieStoreTabMap.getTabsByCookieStoreId(cookieStoreId)];

      // if the only remaining tab is an index tab, close it
      if (tabs[0] && tabs.length == 1 && IndexTab.isIndexTabUrl(tabs[0].url)) {
        await indexTabService.unregisterIndexTab(tabs[0].id);
        await tabs[0].close();
      }
    }
  } catch (e) {
    console.error(e);
  }
});

const resetIndexTabs = async (browserWindows: browser.Windows.Window[]) => {
  const indexTabOption = await config['tab.groups.indexOption'].getValue();
  if (indexTabOption == 'never') return;
  const indexTabIds = new Set<number>();
  const existingIndexTabIds = await indexTabService.getIndexTabIds();
  const createIndexTabPromises: Promise<CompatTab>[] = [];
  const removeIndexTabPromises: Promise<void>[] = [];
  for (const browserWindow of browserWindows) {
    if (browserWindow.incognito) continue;
    if (null == browserWindow.id) continue;
    if (!browserWindow.tabs) continue;
    const tabs = browserWindow.tabs.map((browserTab) => new CompatTab(browserTab));
    const cookieStoreTabMap = new CookieStoreTabMap(tabs);
    const cookieStoreIds = cookieStoreTabMap.getCookieStoreIds();
    for (const cookieStoreId of cookieStoreIds) {
      const tabs = [... cookieStoreTabMap.getTabsByCookieStoreId(cookieStoreId)];
      let hasIndexTab = false;
      let hidden = false;
      for (const tab of tabs) {
        if (tab.hidden) {
          hidden = true;
        }
        if (IndexTab.isIndexTabUrl(tab.url)) {
          const cookieStore = tab.cookieStore;
          hasIndexTab = true;
          indexTabIds.add(tab.id);
          await indexTabService.setIndexTabUserContextId(tab.id, cookieStore.userContextId);
        }
      }
      if (!hasIndexTab && (hidden || indexTabOption == 'always')) {
        createIndexTabPromises.push(indexTabService.createIndexTab(browserWindow.id, cookieStoreId));
      }
      if (hasIndexTab && !hidden && indexTabOption == 'collapsed') {
        removeIndexTabPromises.push(removeIndexTabForCookieStore(cookieStoreId));
      }
    }
  }
  const newIndexTabs = await Promise.all(createIndexTabPromises);
  await Promise.all(removeIndexTabPromises);
  const newIndexTabIds = newIndexTabs.map((tab) => tab.id);
  for (const indexTabId of existingIndexTabIds) {
    if (!indexTabIds.has(indexTabId) && !newIndexTabIds.includes(indexTabId)) {
      await indexTabService.removeIndexTabUserContextId(indexTabId);
    }
  }
};

initialWindowsService.getInitialWindows().then(resetIndexTabs).catch((e) => {
  console.error(e);
});

browser.tabs.onCreated.addListener(async (browserTab) => {
  const indexTabOption = await config['tab.groups.indexOption'].getValue();
  if (indexTabOption != 'always') return;
  if (browserTab.cookieStoreId == null || browserTab.windowId == null) {
    console.warn('Incomplete browser tab', browserTab);
    return;
  }
  const windowId = browserTab.windowId;
  const cookieStoreId = browserTab.cookieStoreId;
  tabQueryService.queryTabs({ tabGroupId: cookieStoreId }).then(async (tabs) => {
    for (const tab of tabs) {
      if ((await indexTabService.getIndexTabUserContextId(tab.id)) != undefined) {
        return;
      }
    }
    await indexTabService.createIndexTab(windowId, cookieStoreId);
  });
});

// prevent index tabs from being pinned
browser.tabs.onUpdated.addListener(async (tabId, _changeInfo, browserTab) => {
  if (browserTab.incognito) return;
  const tab = new CompatTab(browserTab);
  if (!IndexTab.isIndexTabUrl(tab.url)) {
    return;
  }
  if (!tab.pinned) {
    return;
  }
  browser.tabs.update(tabId, {
    pinned: false,
  }).catch((e) => {
    console.error(e);
  });
}, {
  properties: [
    'pinned',
  ],
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, browserTab) => {
  if (browserTab.incognito) return;
  browserTab.id = tabId;
  const tab = new CompatTab(browserTab);
  const cookieStoreId = tab.cookieStore.id;
  const userContextId = tab.cookieStore.userContextId;
  if (!IndexTab.isIndexTabUrl(tab.url)) {
    if ((await indexTabService.getIndexTabUserContextId(tab.id)) == userContextId) {
      await indexTabService.removeIndexTabUserContextId(tab.id);
    } else {
      return;
    }
  } else {
    await indexTabService.setIndexTabUserContextId(tab.id, userContextId);
    return;
  }

  const indexTabOption = await config['tab.groups.indexOption'].getValue();
  if (indexTabOption != 'always') return;
  tabQueryService.queryTabs({
    tabGroupId: tab.cookieStore.id,
    windowId: tab.windowId,
  }).then(async (tabs) => {
    let hasIndexTab = false;
    for (const tab of tabs) {
      if ((await indexTabService.getIndexTabUserContextId(tab.id)) == userContextId) {
        hasIndexTab = true;
        break;
      }
    }

    if (!hasIndexTab) {
      indexTabService.createIndexTab(tab.windowId, cookieStoreId).catch((e) => {
        console.error(e);
      });
    }
  }).catch((e) => {
    console.error(e);
  });
}, {
  properties: [
    'url',
  ],
});

config['tab.groups.indexOption'].onChanged.addListener(async (value) => {
  try {
    if (value == 'never') {
      const indexTabIds = await indexTabService.getIndexTabIds();
      await indexTabService.resetIndexTabStorage();
      await Promise.all(indexTabIds.map((indexTabId) => browser.tabs.remove(indexTabId)));
    } else {
      await resetIndexTabs(await browser.windows.getAll({ populate: true }));
    }
  } catch (e) {
    console.error(e);
  }
});
