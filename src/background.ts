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
import { isNewTabPage } from './modules/newtab';

import { WebExtensionsBroadcastChannel } from './modules/broadcasting';
import { getActiveUserContext, setActiveUserContext } from './modules/usercontext-state.js';
import { config } from './config/config';
import { UserContext } from './frameworks/tabGroups';
import { UserContextService } from './userContexts/UserContextService';
import { UserContextVisibilityService } from './userContexts/UserContextVisibilityService';
import { BeforeRequestHandler } from './background/BeforeRequestHandler';
import { Tab } from './frameworks/tabs';
import { BackgroundUtils } from './background/BackgroundUtils';
import { TabSortingService } from './background/TabSortingService';
import './background/IndexTabHandler';
import './background/BackgroundContainerObservers';
import './background/BackgroundMenu';

// watchdog
let scriptCompleted = false;
const scriptStart = Date.now();
window.addEventListener('error', () => {
  if (!scriptCompleted) {
    setTimeout(() => location.reload(), 10000);
  }
});

const userContextService = UserContextService.getInstance();
const userContextVisibilityService = UserContextVisibilityService.getInstance();
const tabSortingService = TabSortingService.getInstance();
const utils = new BackgroundUtils();

const tabChangeChannel = new WebExtensionsBroadcastChannel('tab_change');

// Set<number>
// Set of tab IDs.
const openTabs = new Set;

let configNewTabInContainerEnabled = true;
let configExternalTabChooseContainer = true;
let configExternalTabContainerOption = 'choose';
config['newtab.keepContainer'].observe((value) => {
  configNewTabInContainerEnabled = value;
});

config['tab.external.containerOption'].observe((value) => {
  configExternalTabContainerOption = value;

  if (value == 'disabled') {
    configExternalTabChooseContainer = false;
  } else {
    configExternalTabChooseContainer = true;
  }
});

browser.tabs.onAttached.addListener(async () => {
  await tabSortingService.sortTabs();
  tabChangeChannel.postMessage(true);
});

browser.tabs.onCreated.addListener((tab) => {
  if (null == tab.cookieStoreId || null == tab.windowId || null == tab.id) return;
  if (UserContext.isCookieStoreIdPrivateBrowsing(tab.cookieStoreId)) {
    return;
  }
  const userContextId = UserContext.fromCookieStoreId(tab.cookieStoreId);
  const activeUserContextId = getActiveUserContext(tab.windowId);
  const windowId = tab.windowId;
  if (configNewTabInContainerEnabled && tab.url == 'about:newtab' && 0 == userContextId && 0 != activeUserContextId) {
    utils.reopenNewTabInContainer(tab.id, activeUserContextId, windowId).catch((e) => {
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
  tabSortingService.sortTabs().then(() => {
    tabChangeChannel.postMessage(true);
  }).catch((e) => {
    console.error(e);
  });
});

browser.tabs.onRemoved.addListener(async (tabId) => {
  openTabs.delete(tabId);
});

browser.tabs.onMoved.addListener(async (tabId, /*movedInfo*/) => {
  const tab = await browser.tabs.get(tabId);
  if (tab.pinned) {
    return;
  }
  await tabSortingService.sortTabs();
  tabChangeChannel.postMessage(true);
});

browser.tabs.onUpdated.addListener((/*tabId, changeInfo, tab*/) => {
  //console.log('tab %d hidden on window %d', tabId, tab.windowId);
  tabChangeChannel.postMessage(true);
}, {
  properties: [
    'hidden',
  ],
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tabObj) => {
  if (tabObj.cookieStoreId == null || tabObj.url == null || tabObj.windowId == null) return;
  if (UserContext.isCookieStoreIdPrivateBrowsing(tabObj.cookieStoreId)) {
    return;
  }
  const userContextId = UserContext.fromCookieStoreId(tabObj.cookieStoreId);
  const windowId = tabObj.windowId;
  const activeUserContextId = getActiveUserContext(tabObj.windowId);
  if (configNewTabInContainerEnabled && isNewTabPage(tabObj.url) && 0 == userContextId && 0 != activeUserContextId) {
    console.log('Reopening new tab in active user context: %d for window %d', activeUserContextId, tabObj.windowId);
    utils.reopenNewTabInContainer(tabId, activeUserContextId, windowId).catch((e) => {
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
  const tabObj = await browser.tabs.get(tabId);
  if (tabObj.cookieStoreId == null || tabObj.id == null) return;
  if (UserContext.isCookieStoreIdPrivateBrowsing(tabObj.cookieStoreId)) {
    return;
  }
  const userContextId = UserContext.fromCookieStoreId(tabObj.cookieStoreId);
  const userContext = userContextService.fillDefaultValues(await UserContext.get(userContextId));
  const windowTitlePreface = browser.i18n.getMessage('windowTitlePrefaceTemplate', userContext.name);
  try {
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
  if (!tabObj.pinned) {
    await userContextVisibilityService.showContainerOnWindow(windowId, userContextId);
  }
});

tabSortingService.sortTabs();


browser.windows.getAll({
  windowTypes: ['normal'],
}).then(async (windows) => {
  for (const window of windows) {
    if (window.incognito) continue;
    if (window.id == null) continue;
    const activeTabs = await browser.tabs.query({
      windowId: window.id,
      active: true,
    });
    for (const activeTab of activeTabs) {
      if (activeTab.cookieStoreId == null) continue;
      const userContextId = UserContext.fromCookieStoreId(activeTab.cookieStoreId);
      const userContext = userContextService.fillDefaultValues(await UserContext.get(userContextId));
      const windowTitlePreface = browser.i18n.getMessage('windowTitlePrefaceTemplate', userContext.name);
      await browser.windows.update(window.id, {
        titlePreface: windowTitlePreface,
      });
    }
  }
});

const beforeRequestHandler = new BeforeRequestHandler(async (details) => {
  // since this is never a private tab, we can use this safely.
  if (details.cookieStoreId == null || details.tabId == -1) return false;
  const userContextId = UserContext.fromCookieStoreId(details.cookieStoreId);
  const userContextIds = new Set((await UserContext.getAll(false)).map((userContext) => userContext.id));
  const userContextIsDefined = userContextIds.has(userContextId);
  if (details.frameId != 0 || 0 != userContextId && userContextIsDefined || details.originUrl || details.incognito || !configExternalTabChooseContainer && userContextIsDefined) {
    return false;
  }
  if (openTabs.has(details.tabId)) {
    console.info('Ignoring manually navigated tab: %d', details.tabId);
    return false;
  }
  const tabId = details.tabId;
  const {url} = details;
  console.log('Capturing request for tab %d: %s', tabId, url);

  const tab = await Tab.get(tabId);
  const {windowId} = tab;
  const activeUserContextId = getActiveUserContext(windowId);
  if ('sticky' == configExternalTabContainerOption) {
    if (userContextId == activeUserContextId) {
      console.log('Tab %d in active user context %d', tabId, userContextId);
      openTabs.add(tabId);
      return false;
    } else {
      await browser.tabs.remove(tabId);
      await browser.tabs.create({
        active: true,
        url,
        cookieStoreId: UserContext.toCookieStoreId(activeUserContextId), // this tab is never private
        windowId,
      });
      console.log('Reopened %s in container id %d', url, activeUserContextId);
    }
  }

  return true;
});

setTimeout(() => {
  beforeRequestHandler.startListening();
}, 1000);

console.log('background.js loaded in %d ms', Date.now() - scriptStart);
scriptCompleted = true;
