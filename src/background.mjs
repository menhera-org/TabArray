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

import * as containers from './modules/containers.mjs';
import { isNewTabPage } from './modules/newtab.mjs';

import {WebExtensionsBroadcastChannel} from './modules/broadcasting.mjs';
import { getActiveUserContext } from './modules/usercontext-state.mjs';
import {config} from './modules/config.mjs';
import { setActiveUserContext } from './modules/usercontext-state.mjs';
import { ADDON_PAGE } from './defs.mjs';
import { getWindowIds } from './modules/windows.mjs';
import './state-manager/StateManager.mjs';

const tabChangeChannel = new WebExtensionsBroadcastChannel('tab_change');

let tabSorting = false;
let configNewTabInContainerEnabled = true;
let configDragBetweenContainers = true;
config.observe('newtab.keepContainer', (value) => {
  if (undefined !== value) {
    configNewTabInContainerEnabled = value;
  }
});

config.observe('gesture.dragTabBetweenContainers', (value) => {
  if (undefined !== value) {
    configDragBetweenContainers = value;
  }
});

globalThis.sortTabsByWindow = async (windowId) => {
  try {
    const tabs = await browser.tabs.query({windowId: windowId});
    const pinnedTabs = tabs.filter(tab => tab.pinned);
    const sortedTabs = tabs.filter(tab => !tab.pinned);
    sortedTabs.sort((tab1, tab2) => {
      const userContextId1 = containers.toUserContextId(tab1.cookieStoreId);
      const userContextId2 = containers.toUserContextId(tab2.cookieStoreId);
      return userContextId1 - userContextId2;
    });
    const pinnedCount = pinnedTabs.length;
    for (let i = 0; i < sortedTabs.length; i++) {
      const tab = sortedTabs[i];
      const currentIndex = tab.index;
      const targetIndex = pinnedCount + i;
      if (targetIndex != currentIndex) {
        await browser.tabs.move(tab.id, {index: targetIndex});
      }
    }
  } catch (e) {
    console.error(e);
  }
};

globalThis.sortTabs = async () => {
  if (tabSorting) return;
  tabSorting = true;
  try {
    for (const windowId of await getWindowIds()) {
      await sortTabsByWindow(windowId);
    }
  } catch (e) {
    console.error(e);
  } finally {
    tabSorting = false;
  }
};

browser.tabs.onAttached.addListener(async () => {
  await sortTabs();
  tabChangeChannel.postMessage(true);
});

browser.tabs.onCreated.addListener(async (tab) => {
  const userContextId = containers.toUserContextId(tab.cookieStoreId);
  const activeUserContextId = getActiveUserContext(tab.windowId);
  const windowId = tab.windowId;
  if (configNewTabInContainerEnabled && tab.url == 'about:newtab' && 0 == userContextId && 0 != activeUserContextId) {
    //console.log('Reopening new tab in active user context: %d for window %d', activeUserContextId, windowId);
    await browser.tabs.remove(tab.id);
    await containers.openNewTabInContainer(activeUserContextId, windowId);
  }
  await sortTabs();
  tabChangeChannel.postMessage(true);
});

browser.tabs.onMoved.addListener(async (tabId, movedInfo) => {
  const tab = await browser.tabs.get(tabId);
  if (tab.pinned) {
    return;
  }
  let prevTab, nextTab;
  try {
    if (tabSorting || !configDragBetweenContainers) throw void 0;
    prevTab = (await browser.tabs.query({
      windowId: tab.windowId,
      index: tab.index - 1,
      pinned: false,
    }))[0];
  } catch (e) {}
  try {
    if (tabSorting || !configDragBetweenContainers) throw void 0;
    nextTab = (await browser.tabs.query({
      windowId: tab.windowId,
      index: tab.index + 1,
    }))[0];
    if (nextTab.status == 'loading') {
      nextTab = undefined;
    }
  } catch (e) {}
  // Reopen in a different container when moved to that container.
  if (prevTab || nextTab) {
    if (prevTab && nextTab && prevTab.cookieStoreId == nextTab.cookieStoreId) {
      const targetUserContextId = containers.toUserContextId(prevTab.cookieStoreId);
      await containers.reopenInContainer(targetUserContextId, tab.id);
    } else if (prevTab && !nextTab) {
      const targetUserContextId = containers.toUserContextId(prevTab.cookieStoreId);
      await containers.reopenInContainer(targetUserContextId, tab.id);
    } else if (!prevTab && nextTab) {
      const targetUserContextId = containers.toUserContextId(nextTab.cookieStoreId);
      await containers.reopenInContainer(targetUserContextId, tab.id);
    }
  }
  await sortTabs();
  tabChangeChannel.postMessage(true);
});

browser.tabs.onUpdated.addListener(async () => {
  await sortTabs();
  tabChangeChannel.postMessage(true);
}, {
  properties: [
    'pinned',
  ],
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  //console.log('tab %d hidden on window %d', tabId, tab.windowId);
  tabChangeChannel.postMessage(true);
}, {
  properties: [
    'hidden',
  ],
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const userContextId = containers.toUserContextId(tab.cookieStoreId);
  const windowId = tab.windowId;
  const activeUserContextId = getActiveUserContext(tab.windowId);
  if (configNewTabInContainerEnabled && isNewTabPage(tab.url) && 0 == userContextId && 0 != activeUserContextId) {
    console.log('Reopening new tab in active user context: %d for window %d', activeUserContextId, tab.windowId);
    await browser.tabs.remove(tab.id);
    await containers.openNewTabInContainer(activeUserContextId, windowId);
    return;
  }
  setActiveUserContext(tab.windowId, userContextId);
}, {
  properties: [
    'url',
    'status',
  ],
});

browser.tabs.onActivated.addListener(async ({tabId, windowId}) => {
  //console.log('active tab changed on window %d', windowId);
  const tab = await browser.tabs.get(tabId);
  const userContextId = containers.toUserContextId(tab.cookieStoreId);
  const contextualIdentity = await containers.get(userContextId);
  const windowTitlePreface = browser.i18n.getMessage('windowTitlePrefaceTemplate', contextualIdentity.name);
  try {
    await browser.windows.update(windowId, {
      titlePreface: windowTitlePreface,
    });
  } catch (e) {
    console.error(e);
  }
  if (!tab.pinned) {
    await containers.show(userContextId, windowId);
  }
});

browser.contextualIdentities.onRemoved.addListener(({contextualIdentity}) => {
  const userContextId = containers.toUserContextId(contextualIdentity.cookieStoreId);
  console.log('userContext %d removed', userContextId);
  containers.closeAllTabs(userContextId).then(() => {
    console.log('Closed all tabs for userContext %d', userContextId);
  }).catch(err => {
    console.error('cleanup failed for userContext %d', userContextId);
  });
});

sortTabs();

browser.menus.create({
  id: 'tab-hide-container',
  title: browser.i18n.getMessage('contextMenuHideSelectedContainer'),
  contexts: ['tab'],
});

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == 'tab-hide-container') {
    const userContextId = containers.toUserContextId(tab.cookieStoreId);
    containers.hide(userContextId, tab.windowId).catch(e => console.error(e));
  }
});

browser.windows.getAll({
  windowTypes: ['normal'],
}).then(async (windows) => {
  for (const window of windows) {
    const activeTabs = await browser.tabs.query({
      windowId: window.id,
      active: true,
    });
    for (const activeTab of activeTabs) {
      const userContextId = containers.toUserContextId(activeTab.cookieStoreId);
      const contextualIdentity = await containers.get(userContextId);
      const windowTitlePreface = browser.i18n.getMessage('windowTitlePrefaceTemplate', contextualIdentity.name);
      await browser.windows.update(window.id, {
        titlePreface: windowTitlePreface,
      });
    }
  }
});

browser.runtime.setUninstallURL(ADDON_PAGE).catch((e) => console.error(e));

browser.webRequest.onBeforeRequest.addListener((details) => {
  //
  const userContextId = containers.toUserContextId(details.cookieStoreId);
  const result = {};
  do {
    //
    if (details.frameId != 0) break;
    if (details.incognito) break;
    if (details.originUrl) break;
    if (0 != userContextId) break;
    const {url} = details;
    console.log('New navigation target: %s', url);
    const confirmPage = browser.runtime.getURL('navigation/confirm.html');
    result.redirectUrl = confirmPage + '?' + (new URLSearchParams({
      url,
    }));
  } while (false);
  return result;
}, {
  incognito: false,
  urls: [
    '*://*/*'
  ],
  types: [
    'main_frame',
  ],
}, ['blocking']);
