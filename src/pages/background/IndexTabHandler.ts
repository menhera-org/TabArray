// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import browser from 'webextension-polyfill';
import { Uint32 } from "weeg-types";
import { CompatTab, CompatTabGroup, CookieStoreTabGroupFilter, WindowTabGroupFilter } from 'weeg-tabs';

import * as containers from '../../legacy-lib/modules/containers';
import { IndexTab } from '../../legacy-lib/modules/IndexTab';

import { WindowUserContextList } from '../../legacy-lib/tabGroups';

import { config } from '../../config/config';
import { UserContextVisibilityService } from '../../legacy-lib/userContexts/UserContextVisibilityService';
import { InitialWindowsService } from './InitialWindowsService';

const userContextVisibilityService = UserContextVisibilityService.getInstance();
const initialWindowsService = InitialWindowsService.getInstance();
const indexTabUserContextMap = new Map<number, Uint32.Uint32>();

const handleClosedIndexTab = async (tabId: number, windowId: number) => {
  const indexTabUserContextId = indexTabUserContextMap.get(tabId);
  if (indexTabUserContextId != undefined) {
    indexTabUserContextMap.delete(tabId);
    // index closed, close all tabs of that group
    console.log('index tab %d closed on window %d, close all tabs of that group %d', tabId, windowId, indexTabUserContextId);
    await containers.closeAllTabsOnWindow(indexTabUserContextId, windowId);
  }
};

browser.tabs.onRemoved.addListener(async (tabId, {windowId, isWindowClosing}) => {
  if (isWindowClosing) return;
  handleClosedIndexTab(tabId, windowId).catch((e) => {
    console.error(e);
  });

  try {
    const list = await WindowUserContextList.create(windowId);
    for (const userContext of list.getOpenUserContexts()) {
      const tabs = [... list.getUserContextTabs(userContext.id)];

      // if the only remaining tab is an index tab, close it
      if (tabs[0] && tabs.length == 1 && IndexTab.isIndexTabUrl(tabs[0].url)) {
        await userContextVisibilityService.unregisterIndexTab(tabs[0].id);
        await tabs[0].close();
      }
    }
  } catch (e) {
    console.error(e);
  }
});

browser.tabs.query({}).then(async (browserTabs) => {
  const tabs = browserTabs.map((browserTab) => new CompatTab(browserTab));
  for (const tab of tabs) {
    if (IndexTab.isIndexTabUrl(tab.url)) {
      indexTabUserContextMap.set(tab.id, tab.cookieStore.userContextId);
    }
  }
});

initialWindowsService.getInitialWindows().then(async (browserWindows) => {
  const indexTabOption = await config['tab.groups.indexOption'].getValue();
  if (indexTabOption == 'never') return;
  for (const browserWindow of browserWindows) {
    if (null == browserWindow.id) continue;
    const windowUserContextList = await WindowUserContextList.create(browserWindow.id);
    const userContexts = windowUserContextList.getOpenUserContexts();
    for (const userContext of userContexts) {
      const tabs = [... windowUserContextList.getUserContextTabs(userContext.id)];
      let hasIndexTab = false;
      let hidden = false;
      for (const tab of tabs) {
        if (tab.hidden) {
          hidden = true;
        }
        if (IndexTab.isIndexTabUrl(tab.url)) {
          hasIndexTab = true;
        }
      }
      if (!hasIndexTab && (hidden || indexTabOption == 'always')) {
        await userContextVisibilityService.createIndexTab(browserWindow.id, userContext.id);
      }
    }
  }
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
  browserTab.id = tabId;
  const tab = new CompatTab(browserTab);
  const userContextId = tab.cookieStore.userContextId;
  if (!IndexTab.isIndexTabUrl(tab.url)) {
    indexTabUserContextMap.delete(tab.id);
  } else {
    indexTabUserContextMap.set(tab.id, userContextId);
  }

  const indexTabOption = await config['tab.groups.indexOption'].getValue();
  if (indexTabOption != 'always') return;
  const compatTabGroup = new CompatTabGroup(new CookieStoreTabGroupFilter(tab.cookieStore.id), new WindowTabGroupFilter(tab.windowId));
  compatTabGroup.getTabs().then((tabs) => {
    let hasIndexTab = false;
    for (const tab of tabs) {
      if (IndexTab.isIndexTabUrl(tab.url)) {
        hasIndexTab = true;
        break;
      }
    }

    if (!hasIndexTab) {
      userContextVisibilityService.createIndexTab(tab.windowId, userContextId).catch((e) => {
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
