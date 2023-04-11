// vim: ts=2 sw=2 et ai
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

import './install';
import browser from 'webextension-polyfill';
import { CompatTab } from 'weeg-tabs';

import { isNewTabPage } from './modules/newtab';

import { WebExtensionsBroadcastChannel } from './modules/broadcasting';
import { getActiveUserContext, setActiveUserContext } from './modules/usercontext-state.js';
import { config } from './config/config';
import { UserContext } from './frameworks/tabGroups';
import { UserContextVisibilityService } from './userContexts/UserContextVisibilityService';
import { BeforeRequestHandler } from './background/BeforeRequestHandler';
import { Tab } from './frameworks/tabs';
import { BackgroundUtils } from './background/BackgroundUtils';
import { TabSortingService } from './background/TabSortingService';
import './background/IndexTabHandler';
import './background/BackgroundContainerObservers';
import './background/BackgroundMenu';
import './background/BackgroundCookieAutoclean';
import './background/FramingHeadersService';
import './api/ApiDefinitions';
import './overrides/fetch';
import './languages/register-content-script';
import './containers/background-temporary-containers';
import './autodiscard/background-autodiscard';
import './cookies/background-storage-observer';
import './background/BackgroundMessageListeners';
import './background/KeyboardShortcurListeners';
import './background/BrowserActionUpdater';
import { UaContentScriptRegistrar} from './overrides/UaContentScriptRegistrar';
import { ExternalServiceProvider } from './lib/ExternalServiceProvider';
import { ContainerTabOpenerService } from './lib/tabGroups/ContainerTabOpenerService';

// watchdog
let scriptCompleted = false;
const scriptStart = Date.now();
window.addEventListener('error', () => {
  if (!scriptCompleted) {
    setTimeout(() => location.reload(), 10000);
  }
});

// auto reload
const AUTO_RELOAD_MONITOR_INTERVAL = 5000;
setInterval(() => {
  Promise.all([
    fetch('/manifest.json'),
    fetch('/theme.css'),
  ]).catch(() => {
    browser.runtime.reload();
  });
}, AUTO_RELOAD_MONITOR_INTERVAL);

const TAB_SORTING_INTERVAL = 10000;

ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
ExternalServiceProvider.getInstance();
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

browser.tabs.onCreated.addListener((browserTab) => {
  try {
    if (null == browserTab.cookieStoreId || null == browserTab.windowId || null == browserTab.id || null == browserTab.url) return;
    const tab = new CompatTab(browserTab);
    const cookieStore = tab.cookieStore;
    if (cookieStore.isPrivate) {
      return;
    }
    const userContextId = cookieStore.userContextId;
    const activeUserContextId = getActiveUserContext(tab.windowId);
    const windowId = tab.windowId;
    if (configNewTabInContainerEnabled && tab.url == 'about:newtab' && 0 == userContextId && 0 != activeUserContextId) {
      utils.reopenNewTabInContainer(tab.id, activeUserContextId, windowId).catch((e) => {
        console.error(e);
      });
      return;
    }

    if (tab.url != 'about:blank' && browserTab.status != 'loading') {
      console.log('Manually opened tab: %d', tab.id);
      openTabs.add(tab.id);
    } else if (tab.pinned) {
      console.log('Pinned tab: %d', tab.id);
      openTabs.add(tab.id);
    } else if (tab.url == 'about:blank') {
      // handles the case when the new tab page is about:blank
      const tabId = tab.id;
      setTimeout(() => {
        browser.tabs.get(tabId).then((browserTab) => {
          if (browserTab.url == 'about:blank' && browserTab.status != 'loading') {
            openTabs.add(browserTab.id);
            if (browserTab.active) {
              setActiveUserContext(browserTab.windowId, userContextId);
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
  } catch (e) {
    console.error(e);
  }
});

browser.tabs.onRemoved.addListener(async (tabId) => {
  openTabs.delete(tabId);
});

browser.tabs.onMoved.addListener(async (tabId, /*movedInfo*/) => {
  try {
    const browserTab = await browser.tabs.get(tabId);
    if (browserTab.pinned) {
      return;
    }
    await tabSortingService.sortTabs();
    tabChangeChannel.postMessage(true);
  } catch (e) {
    console.error(e);
  }
});

browser.tabs.onUpdated.addListener((/*tabId, changeInfo, browserTab*/) => {
  //console.log('tab %d hidden on window %d', tabId, tab.windowId);
  tabChangeChannel.postMessage(true);
}, {
  properties: [
    'hidden',
  ],
});

browser.tabs.onUpdated.addListener((/*tabId, changeInfo, browserTab*/) => {
  tabSortingService.sortTabs().catch((e) => {
    console.error(e);
  });
}, {
  properties: [
    'pinned',
  ],
});

browser.tabs.onUpdated.addListener((tabId, _changeInfo, browserTab) => {
  try {
    browserTab.id = tabId;
    if (browserTab.cookieStoreId == null || browserTab.url == null || browserTab.windowId == null) return;
    const tab = new CompatTab(browserTab);
    const cookieStore = tab.cookieStore;
    if (cookieStore.isPrivate) {
      return;
    }
    const userContextId = cookieStore.userContextId;
    const windowId = tab.windowId;
    const activeUserContextId = getActiveUserContext(tab.windowId);
    if (configNewTabInContainerEnabled && isNewTabPage(tab.url) && 0 == userContextId && 0 != activeUserContextId) {
      console.log('Reopening new tab in active user context: %d for window %d', activeUserContextId, tab.windowId);
      utils.reopenNewTabInContainer(tab.id, activeUserContextId, windowId).catch((e) => {
        console.error(e);
      });
      return;
    }
    if (tab.url != 'about:blank' && browserTab.status != 'loading') {
      if (!openTabs.has(tab.id)) {
        console.log('Manually opened tab: %d', tab.id);
        openTabs.add(tab.id);
      }
    } else if (tab.pinned) {
      if (!openTabs.has(tab.id)) {
        console.log('Pinned tab: %d', tab.id);
        openTabs.add(tab.id);
      }
    }
    if (tab.url != 'about:blank' && browserTab.status != 'loading' && tab.active) {
      const activeUserContextId: number = getActiveUserContext(tab.windowId);
      if (activeUserContextId != userContextId) {
        console.log('setActiveUserContext for window %d and user context %d', tab.windowId, userContextId);
        setActiveUserContext(tab.windowId, userContextId);
      }
    }
  } catch (e) {
    console.error(e);
  }
}, {
  properties: [
    'url',
    'status',
  ],
});

browser.tabs.onActivated.addListener(async ({tabId, windowId}) => {
  try {
    const browserTab = await browser.tabs.get(tabId);
    const tab = new CompatTab(browserTab);
    const cookieStore = tab.cookieStore;
    if (browserTab.cookieStoreId == null || browserTab.id == null) return;
    if (cookieStore.isPrivate) {
      return;
    }
    const userContextId = cookieStore.userContextId;
    try {
      const indexTabUrl = await browser.sessions.getTabValue(browserTab.id, 'indexTabUrl');
      if (!indexTabUrl) {
        throw void 0;
      }
      const nextTabs = await browser.tabs.query({
        windowId: browserTab.windowId,
        index: browserTab.index + 1,
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

    if (!browserTab.pinned) {
      await userContextVisibilityService.showContainerOnWindow(windowId, userContextId);
    }
  } catch (e) {
    console.error(e);
  }
});

tabSortingService.sortTabs();

setInterval(() => {
  tabSortingService.sortTabs();
}, TAB_SORTING_INTERVAL);

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
  if (tab.discarded) {
    return false;
  }
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

new UaContentScriptRegistrar();

setTimeout(() => {
  beforeRequestHandler.startListening();
}, 1000);

console.log('background.js loaded in %d ms', Date.now() - scriptStart);
scriptCompleted = true;
