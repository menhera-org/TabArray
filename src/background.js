// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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

import './install';
import browser from 'webextension-polyfill';
import * as containers from './modules/containers';
import { isNewTabPage } from './modules/newtab';

import {WebExtensionsBroadcastChannel} from './modules/broadcasting';
import { getActiveUserContext } from './modules/usercontext-state.js';
import { config } from './config/config';
import { setActiveUserContext } from './modules/usercontext-state.js';
import { ADDON_PAGE, CONFIRM_PAGE } from './defs';
import { getWindowIds } from './modules/windows';
import './state-manager/StateManager.js';
import {IndexTab} from './modules/IndexTab';
import { UserContext } from './frameworks/tabGroups';
import { UserContextService } from './userContexts/UserContextService';
import { TabGroupService } from './frameworks/tabGroups';
import { UserContextVisibilityService } from './userContexts/UserContextVisibilityService';
import { BeforeRequestHandler } from './background/BeforeRequestHandler';

// watchdog
let scriptCompleted = false;
const scriptStart = Date.now();
window.addEventListener('error', ev => {
  if (!scriptCompleted) {
    setTimeout(() => location.reload(), 10000);
  }
});

const userContextService = UserContextService.getInstance();
const tabGroupService = TabGroupService.getInstance();
const userContextVisibilityService = UserContextVisibilityService.getInstance();

const tabChangeChannel = new WebExtensionsBroadcastChannel('tab_change');

// Set<number>
// Set of tab IDs.
const openTabs = new Set;

let tabSorting = false;
let configNewTabInContainerEnabled = true;
let configExternalTabChooseContainer = true;
let configExternalTabContainerOption = 'choose';
config['newtab.keepContainer'].observe((value) => {
  configNewTabInContainerEnabled = value;
});

// 'never' -- do not show indeces
// 'collapsed' -- show indeces for collapsed containers
// 'always' -- always show indeces
let configGroupIndexOption = 'never';
config['tab.groups.indexOption'].observe((value) => {
  configGroupIndexOption = value;
});

config['tab.external.containerOption'].observe((value) => {
  configExternalTabContainerOption = value;

  if (value == 'disabled') {
    configExternalTabChooseContainer = false;
  } else {
    configExternalTabChooseContainer = true;
  }
});

const sortTabsByWindow = globalThis.sortTabsByWindow = async (windowId) => {
  try {
    const tabs = await browser.tabs.query({windowId: windowId});
    const pinnedTabs = tabs.filter(tab => tab.pinned);
    let sortedTabs = tabs.filter(tab => !tab.pinned);

    const userContextIds = new Set(tabs.map(tabObj => UserContext.fromCookieStoreId(tabObj.cookieStoreId)));
    const hiddenUserContextIds = new Set(tabs.filter(tabObj => tabObj.hidden).map(tabObj => UserContext.fromCookieStoreId(tabObj.cookieStoreId)));
    const indexedUserContextIds = new Set;
    const indexTabs = new Map;
    for (const tabObj of tabs) {
      const userContextId = UserContext.fromCookieStoreId(tabObj.cookieStoreId);
      try {
        new IndexTab(tabObj.url);
        indexedUserContextIds.add(userContextId);
        indexTabs.set(userContextId, tabObj.id);
      } catch (e) {
        // nothing.
      }
    }
    for (const userContextId of userContextIds) {
      if (configGroupIndexOption == 'collapsed' && !hiddenUserContextIds.has(userContextId)) {
        if (indexTabs.has(userContextId)) {
          const tabId = indexTabs.get(userContextId);
          await browser.sessions.removeTabValue(tabId, 'indexTabUrl');
          await browser.tabs.remove(tabId);
          sortedTabs = sortedTabs.filter((tabObj) => tabObj.id != tabId);
        }
      } else if (configGroupIndexOption != 'never') {
        if (indexTabs.has(userContextId)) {
          continue;
        }
        const tabObj = await containers.createIndexTab(userContextId, windowId);
        sortedTabs.push(tabObj);
      } else {
        break;
      }
    }
    if ('collapsed' == configGroupIndexOption) {
      // TODO
    }
    for (const tabObj of sortedTabs) {
      tabObj.indexTabUrl = await browser.sessions.getTabValue(tabObj.id, 'indexTabUrl');
    }
    sortedTabs.sort((tab1, tab2) => {
      const userContextId1 = UserContext.fromCookieStoreId(tab1.cookieStoreId);
      const userContextId2 = UserContext.fromCookieStoreId(tab2.cookieStoreId);
      if (userContextId1 == userContextId2) {
        if (tab1.indexTabUrl) {
          return -1;
        }
        if (tab2.indexTabUrl) {
          return 1;
        }
      }
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

const sortTabs = globalThis.sortTabs = async () => {
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

browser.tabs.onCreated.addListener((tab) => {
  const userContextId = UserContext.fromCookieStoreId(tab.cookieStoreId);
  const activeUserContextId = getActiveUserContext(tab.windowId);
  const windowId = tab.windowId;
  if (configNewTabInContainerEnabled && tab.url == 'about:newtab' && 0 == userContextId && 0 != activeUserContextId) {
    browser.tabs.remove(tab.id).then(() => {
      return containers.openNewTabInContainer(activeUserContextId, windowId);
    }).catch((e) => {
      console.error(e);
    });
    return;
  }

  if (tab.url && tab.url != 'about:blank' && tab.status != 'loading') {
    console.log('Manually opened tab: %d', tab.id);
    openTabs.add(tab.id);
  } else if (tab.pinned) {
    console.log('Pinned tab: %d', tab.id);
    openTabs.add(tab.id);
  } else if (tab.url == 'about:blank') {
    // handles the case when the new tab page is about:blank
    const tabId = tab.id;
    setTimeout(() => {
      browser.tabs.get(tabId).then((tab) => {
        if (tab.url == 'about:blank' && tab.status != 'loading') {
          openTabs.add(tab.id);
          if (tab.active) {
            setActiveUserContext(tab.windowId, userContextId);
          }
        }
      });
    }, 3000);
  }
  sortTabs().then(() => {
    tabChangeChannel.postMessage(true);
  }).catch((e) => {
    console.error(e);
  });
});

browser.tabs.onRemoved.addListener((tabId, {windowId}) => {
  openTabs.delete(tabId);
});

StateManager.addEventListener('tabClose', async ({detail}) => {
  const {userContextId, windowId, browserTab} = detail;
  try {
    const indexTabUrl = await browser.sessions.getTabValue(browserTab.id, 'indexTabUrl');
    if (!indexTabUrl) {
      throw void 0;
    }
    // index closed, close all tabs of that group
    await containers.closeAllTabsOnWindow(userContextId, windowId);
    return;
  } catch (e) {
    // nothing.
  }

  browser.tabs.query({
    windowId,
    cookieStoreId: UserContext.toCookieStoreId(userContextId),
  }).then(async (tabs) => {
    const indexTabs = new Set;
    let tabCount = 0;
    for (const tabObj of tabs) {
      try {
        const indexTabUrl = await browser.sessions.getTabValue(tabObj.id, 'indexTabUrl');
        if (!indexTabUrl) {
          throw void 0;
        }
        indexTabs.add(tabObj.id);
      } catch (e) {
        tabCount++;
      }
    }
    if (tabCount < 1) {
      await browser.tabs.remove([... indexTabs]);
    }
  }).catch((e) => {
    console.error(e);
  });
});

browser.tabs.onMoved.addListener(async (tabId, movedInfo) => {
  const tab = await browser.tabs.get(tabId);
  if (tab.pinned) {
    return;
  }
  await sortTabs();
  tabChangeChannel.postMessage(true);
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tabObj) => {
  try {
    const indexTabUrl = await browser.sessions.getTabValue(tabObj.id, 'indexTabUrl');
    if (!indexTabUrl) {
      throw void 0;
    }
    await browser.tabs.update(tabId, {
      pinned: false,
    });
  } catch (e) {
    // nothing.
  }
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

browser.tabs.onUpdated.addListener((tabId, changeInfo, tabObj) => {
  const userContextId = UserContext.fromCookieStoreId(tabObj.cookieStoreId);
  const windowId = tabObj.windowId;
  const activeUserContextId = getActiveUserContext(tabObj.windowId);
  if (configNewTabInContainerEnabled && isNewTabPage(tabObj.url) && 0 == userContextId && 0 != activeUserContextId) {
    console.log('Reopening new tab in active user context: %d for window %d', activeUserContextId, tabObj.windowId);
    browser.tabs.remove(tabObj.id).then(() => {
      return containers.openNewTabInContainer(activeUserContextId, windowId);
    }).catch((e) => {
      console.error(e);
    });
    return;
  }
  if (tabObj.url && tabObj.url != 'about:blank' && tabObj.status != 'loading') {
    console.log('Manually opened tab: %d', tabObj.id);
    openTabs.add(tabObj.id);
  } else if (tabObj.pinned) {
    console.log('Pinned tab: %d', tabObj.id);
    openTabs.add(tabObj.id);
  }
  if (tabObj.url != 'about:blank' && tabObj.status != 'loading' && tabObj.active) {
    console.log('setActiveUserContext for window %d and user context %d', tabObj.windowId, userContextId);
    setActiveUserContext(tabObj.windowId, userContextId);
  }
}, {
  properties: [
    'url',
    'status',
  ],
});

browser.tabs.onActivated.addListener(async ({tabId, windowId}) => {
  const tab = await browser.tabs.get(tabId);
  const userContextId = UserContext.fromCookieStoreId(tab.cookieStoreId);
  const userContext = userContextService.fillDefaultValues(await UserContext.get(userContextId));
  const windowTitlePreface = browser.i18n.getMessage('windowTitlePrefaceTemplate', userContext.name);
  try {
    const tabObj = tab;
    const indexTabUrl = await browser.sessions.getTabValue(tabObj.id, 'indexTabUrl');
    if (!indexTabUrl) {
      throw void 0;
    }
    const nextTabs = await browser.tabs.query({
      windowId: tabObj.windowId,
      index: tabObj.index + 1,
    });
    for (const nextTab of nextTabs) {
      await browser.tabs.update(nextTab.id, {
        active: true,
      });
      break;
    }
  } catch (e) {
    // nothing.
  }

  try {
    await browser.windows.update(windowId, {
      titlePreface: windowTitlePreface,
    });
  } catch (e) {
    console.error(e);
  }
  if (!tab.pinned) {
    await userContextVisibilityService.showContainerOnWindow(windowId, userContextId);
  }
});

browser.contextualIdentities.onRemoved.addListener(async ({contextualIdentity}) => {
  const userContextId = UserContext.fromCookieStoreId(contextualIdentity.cookieStoreId);
  console.log('userContext %d removed', userContextId);
  const tabGroup = await tabGroupService.getTabGroupFromUserContextId(userContextId);
  tabGroup.tabList.closeTabs().then(() => {
    console.log('Closed all tabs for userContext %d', userContextId);
  }).catch((e) => {
    console.error('cleanup failed for userContext %d', userContextId, e);
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
    const userContextId = UserContext.fromCookieStoreId(tab.cookieStoreId);
    if (!tab.windowId) {
      return;
    }
    userContextVisibilityService.hideContainerOnWindow(tab.windowId, userContextId).catch(e => console.error(e));
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
      const userContextId = UserContext.fromCookieStoreId(activeTab.cookieStoreId);
      const userContext = userContextService.fillDefaultValues(await UserContext.get(userContextId));
      const windowTitlePreface = browser.i18n.getMessage('windowTitlePrefaceTemplate', userContext.name);
      await browser.windows.update(window.id, {
        titlePreface: windowTitlePreface,
      });
    }
  }
});

browser.runtime.setUninstallURL(ADDON_PAGE).catch((e) => console.error(e));

const beforeRequestHandler = new BeforeRequestHandler(async (details) => {
  const userContextId = UserContext.fromCookieStoreId(details.cookieStoreId);
  if (details.frameId != 0) return false;
  if (details.incognito) return false;
  if (details.originUrl) return false;
  if (0 != userContextId) return false;
  if (!configExternalTabChooseContainer) return false;
  if (openTabs.has(details.tabId)) {
    console.info('Ignoring manually navigated tab: %d', details.tabId);
    return false;
  }
  const tabId = details.tabId;
  const {url} = details;
  console.log('Capturing request for tab %d: %s', tabId, url);
  if (-1 != tabId) {
    const tabObj = StateManager.getBrowserTab(tabId);
    const {windowId} = tabObj;
    const activeUserContextId = getActiveUserContext(windowId);
    if ('sticky' == configExternalTabContainerOption) {
      if (userContextId == activeUserContextId) {
        console.log('Tab %d in active user context %d', tabId, userContextId);
        openTabs.add(tabId);
        browser.tabs.update(tabId, {
          url,
        }).then(() => {
          console.log('Opened %s in tab %d', url, tabId);
        }).catch((e) => {
          console.error(e);
        });
      } else {
        browser.tabs.remove(tabId).then(() => {
          browser.tabs.create({
            active: true,
            url,
            cookieStoreId: UserContext.toCookieStoreId(activeUserContextId),
            windowId,
          }).then(() => {
            console.log('Reopened %s in container id %d', url, activeUserContextId);
          }).catch((e) => {
            console.error(e);
          });
        });
      }
    }
  }

  return true;
});

setTimeout(() => {
  beforeRequestHandler.startListening();
}, 1000);

console.log('background.js loaded in %d ms', Date.now() - scriptStart);
scriptCompleted = true;
