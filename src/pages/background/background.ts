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

import './background-install-handler';
import browser from 'webextension-polyfill';
import { CompatTab } from 'weeg-tabs';
import { CookieStore } from 'weeg-containers';
import { Uint32 } from 'weeg-types';

import { ExternalServiceProvider } from '../../lib/ExternalServiceProvider';
import { ContainerTabOpenerService } from '../../lib/tabGroups/ContainerTabOpenerService';

import { isNewTabPage } from '../../legacy-lib/modules/newtab';
import { WebExtensionsBroadcastChannel } from '../../legacy-lib/modules/broadcasting';
import { getActiveUserContext, setActiveUserContext } from '../../legacy-lib/modules/usercontext-state.js';

import { config } from '../../config/config';
import { UserContextVisibilityService } from '../../legacy-lib/userContexts/UserContextVisibilityService';

import { BeforeRequestHandler } from './BeforeRequestHandler';
import { BackgroundUtils } from './BackgroundUtils';
import { TabSortingService } from '../../lib/tabs/TabSortingService';
import './IndexTabHandler';
import './BackgroundContainerObservers';
import './BackgroundMenu';
import './BackgroundCookieAutoclean';
import './FramingHeadersService';
import './BackgroundMessageListeners';
import './KeyboardShortcurListeners';
import './BrowserActionUpdater';
import '../../api/ApiDefinitions';
import '../../overrides/fetch';
import '../../overrides/language-content-script';
import './background-temporary-containers';
import './background-autodiscard';
import './background-storage-observer';
import { UaContentScriptRegistrar} from '../../overrides/UaContentScriptRegistrar';

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

const containerTabOpenerService = ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
ExternalServiceProvider.getInstance();
const userContextVisibilityService = UserContextVisibilityService.getInstance();
const tabSortingService = TabSortingService.getInstance<TabSortingService>();
const utils = new BackgroundUtils();

const tabChangeChannel = new WebExtensionsBroadcastChannel('tab_change');

// Set<number>
// Set of tab IDs.
const openTabs = new Set<number>();

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
            openTabs.add(tabId);
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
  // This is never called for private tabs.
  try {
    // do not redirect if the tab is loaded when the browser is started
    if (Date.now() - scriptStart < 2000) return false;
    if (details.cookieStoreId == null || details.tabId == -1) return false;
    const cookieStore = new CookieStore(details.cookieStoreId);
    const userContextId = cookieStore.userContextId;
    if (details.frameId != 0 || 0 != userContextId || details.originUrl || details.incognito || !configExternalTabChooseContainer) {
      return false;
    }
    if (openTabs.has(details.tabId)) {
      console.info('Ignoring manually navigated tab: %d', details.tabId);
      return false;
    }
    const tabId = details.tabId;
    const {url} = details;

    const browserTab = await browser.tabs.get(tabId);
    const tab = new CompatTab(browserTab);
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
        // this tab is never private
        const cookieStoreId = CookieStore.fromParams({
          userContextId: activeUserContextId,
          privateBrowsingId: 0 as Uint32.Uint32,
        }).id;

        await containerTabOpenerService.reopenTabInContainer(tabId, cookieStoreId, true);
        console.log('Reopened %s in container id %d', url, activeUserContextId);
      }
    }

    console.log('Capturing request for tab %d: %s', tabId, url);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
});
beforeRequestHandler.startListening();

new UaContentScriptRegistrar();

console.log('background.js loaded in %d ms', Date.now() - scriptStart);
scriptCompleted = true;
