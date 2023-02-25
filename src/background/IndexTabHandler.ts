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
import * as containers from '../modules/containers';
import { IndexTab } from '../modules/IndexTab';
import { UserContext, WindowUserContextList } from '../frameworks/tabGroups';
import { Tab } from '../frameworks/tabs';
import { TabGroupService } from '../frameworks/tabGroups';
import { config } from '../config/config';
import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';
import { PromiseUtils } from '../frameworks/utils';
import { Uint32 } from '../frameworks/types';
import { InitialWindowsService } from './InitialWindowsService';

const tabGroupService = TabGroupService.getInstance();
const userContextVisibilityService = UserContextVisibilityService.getInstance();
const initialWindowsService = InitialWindowsService.getInstance();
const indexTabUserContextMap = new Map<number, Uint32.Uint32>();

browser.tabs.onRemoved.addListener(async (tabId, {windowId, isWindowClosing}) => {
  if (isWindowClosing) return;

  const indexTabUserContextId = indexTabUserContextMap.get(tabId);
  const isIndexTab = await userContextVisibilityService.isIndexTab(tabId);
  if (indexTabUserContextId != undefined && isIndexTab) {
    indexTabUserContextMap.delete(tabId);
    // index closed, close all tabs of that group
    console.log('index tab %d closed on window %d, close all tabs of that group %d', tabId, windowId, indexTabUserContextId);
    await containers.closeAllTabsOnWindow(indexTabUserContextId, windowId);
    return;
  }

  const list = await WindowUserContextList.create(windowId);
  for (const userContext of list.getOpenUserContexts()) {
    const tabs = [... list.getUserContextTabs(userContext.id)];

    // if the only remaining tab is the index tab, close it
    if (tabs[0] && tabs.length == 1 && IndexTab.isIndexTabUrl(tabs[0].url)) {
      await userContextVisibilityService.unregisterIndexTab(tabs[0].id);
      await tabs[0].close();
    }
  }
});

browser.tabs.onCreated.addListener(async (browserTab) => {
  if (browserTab.id == null) return;
  const indexTabOption = await config['tab.groups.indexOption'].getValue();
  await PromiseUtils.sleep(100);
  if (indexTabOption != 'always') return;
  const tab = new Tab(await browser.tabs.get(browserTab.id));
  const browserWindow = await browser.windows.get(tab.windowId, {populate: false});
  if (browserWindow.incognito) return;
  if (IndexTab.isIndexTabUrl(tab.url)) {
    indexTabUserContextMap.set(tab.id, tab.userContextId);
  }
  const tabGroup = await (tab.isPrivate()
    ? tabGroupService.getPrivateBrowsingTabGroup()
    : tabGroupService.getTabGroupFromUserContextId(tab.originAttributes.userContextId ?? UserContext.ID_DEFAULT));
  let hasIndexTab = false;
  for (const tab of await tabGroup.tabList.getTabs()) {
    if (IndexTab.isIndexTabUrl(tab.url)) {
      hasIndexTab = true;
      break;
    }
  }
  if (!hasIndexTab) {
    await userContextVisibilityService.createIndexTab(tab.windowId, tabGroup.originAttributes.userContextId ?? UserContext.ID_DEFAULT);
  }
});

browser.tabs.query({}).then(async (browserTabs) => {
  const userContextIdsWithIndexTab = new Set<Uint32.Uint32>();
  const tabs = browserTabs.map((browserTab) => new Tab(browserTab));
  for (const tab of tabs) {
    if (IndexTab.isIndexTabUrl(tab.url)) {
      indexTabUserContextMap.set(tab.id, tab.userContextId);
      userContextIdsWithIndexTab.add(tab.userContextId);
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
browser.tabs.onUpdated.addListener(async (tabId) => {
  try {
    const indexTabUrl = await browser.sessions.getTabValue(tabId, 'indexTabUrl');
    if (!indexTabUrl) {
      throw void 0;
    }
    await browser.tabs.update(tabId, {
      pinned: false,
    });
  } catch (e) {
    // nothing.
  }
}, {
  properties: [
    'pinned',
  ],
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, browserTab) => {
  const url = browserTab.url ?? 'about:blank';
  if (!IndexTab.isIndexTabUrl(url)) {
    indexTabUserContextMap.delete(tabId);
  }
}, {
  properties: [
    'url',
  ],
});
