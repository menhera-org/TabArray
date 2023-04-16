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

import './background-install-handler';
import browser from 'webextension-polyfill';
import { CompatTab } from 'weeg-tabs';
import { CookieStore } from 'weeg-containers';
import { Alarm } from 'weeg-utils';

import { ExternalServiceProvider } from '../../lib/ExternalServiceProvider';
import { ContainerTabOpenerService } from '../../lib/tabGroups/ContainerTabOpenerService';
import { PageLoaderService } from '../../lib/PageLoaderService';
import { OpenTabsService } from '../../lib/states/OpenTabsService';
import { ActiveContainerService } from '../../lib/states/ActiveContainerService';
import { ElapsedTimeService } from '../../lib/ElapsedTimeService';

import { config } from '../../config/config';

import { UserContextVisibilityService } from '../../legacy-lib/userContexts/UserContextVisibilityService';

import { BeforeRequestHandler } from './BeforeRequestHandler';
import { TabSortingService } from '../../lib/tabs/TabSortingService';
import './background-index-tab';
import './background-container-observer';
import './background-menus';
import './background-cookie-autoclean';
import './FramingHeadersService';
import './background-container-creator';
import './background-commands';
import './background-update-browserAction';
import '../../api/ApiDefinitions';
import '../../overrides/fetch';
import '../../overrides/language-content-script';
import './background-temporary-containers';
import './background-autodiscard';
import './background-storage-observer';
import './background-active-container';
import { UaContentScriptRegistrar} from '../../overrides/UaContentScriptRegistrar';

// auto reload
const AUTO_RELOAD_MONITOR_INTERVAL_IN_MINUTES = 1;

const autoReloadAlarm = new Alarm('autoReload', {
  periodInMinutes: AUTO_RELOAD_MONITOR_INTERVAL_IN_MINUTES,
});

autoReloadAlarm.onAlarm.addListener(() => {
  Promise.all([
    fetch('/manifest.json'),
    fetch('/css/theme.css'),
  ]).catch(() => {
    browser.runtime.reload();
  });
});

const TAB_SORTING_INTERVAL_IN_MINUTES = 1;

PageLoaderService.getInstance<PageLoaderService>();
ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
ExternalServiceProvider.getInstance();
const userContextVisibilityService = UserContextVisibilityService.getInstance();
const tabSortingService = TabSortingService.getInstance<TabSortingService>();
const openTabsService = OpenTabsService.getInstance();
const activeContainerService = ActiveContainerService.getInstance();
const elapsedTimeService = ElapsedTimeService.getInstance();

browser.tabs.onAttached.addListener(async () => {
  await tabSortingService.sortTabs();
});

browser.tabs.onCreated.addListener((browserTab) => {
  try {
    if (null == browserTab.cookieStoreId || null == browserTab.windowId || null == browserTab.id || null == browserTab.url) return;
    const tab = new CompatTab(browserTab);
    const cookieStore = tab.cookieStore;
    if (cookieStore.isPrivate) {
      return;
    }

    tabSortingService.sortTabs().catch((e) => {
      console.error(e);
    });
  } catch (e) {
    console.error(e);
  }
});

browser.tabs.onMoved.addListener(async (tabId, /*movedInfo*/) => {
  try {
    const browserTab = await browser.tabs.get(tabId);
    if (browserTab.pinned) {
      return;
    }
    await tabSortingService.sortTabs();
  } catch (e) {
    console.error(e);
  }
});

browser.tabs.onUpdated.addListener((/*tabId, changeInfo, browserTab*/) => {
  //console.log('tab %d hidden on window %d', tabId, tab.windowId);
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

browser.tabs.onActivated.addListener(async ({tabId, windowId}) => {
  try {
    const browserTab = await browser.tabs.get(tabId);
    if (browserTab.cookieStoreId == null || browserTab.id == null) return;
    const tab = new CompatTab(browserTab);
    const cookieStore = tab.cookieStore;
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

tabSortingService.sortTabs().catch((e) => {
  console.error(e);
});

const tabSortingAlarm = new Alarm('tabSorting', {
  periodInMinutes: TAB_SORTING_INTERVAL_IN_MINUTES,
});

tabSortingAlarm.onAlarm.addListener(() => {
  tabSortingService.sortTabs().catch((e) => {
    console.error(e);
  });
});

const beforeRequestHandler = new BeforeRequestHandler(async (details) => {
  // This is never called for private tabs.
  try {
    // do not redirect if the tab is loaded when the browser is started
    const elapsedTime = await elapsedTimeService.getElapsedTime();
    if (elapsedTime < 2000) return false;
    if (details.cookieStoreId == null || details.tabId == -1 || details.frameId != 0 || details.originUrl || details.incognito) return false;
    const cookieStoreId = details.cookieStoreId;

    const externalTabContainerOption = await config['tab.external.containerOption'].getValue();
    if (cookieStoreId != CookieStore.DEFAULT.id || externalTabContainerOption == 'disabled') {
      return false;
    }

    if (await openTabsService.hasTab(details.tabId)) {
      console.info('Ignoring manually navigated tab: %d', details.tabId);
      return false;
    }

    const {tabId, url} = details;

    const browserTab = await browser.tabs.get(tabId);
    const tab = new CompatTab(browserTab);
    const {windowId} = tab;
    if (tab.discarded) {
      return false;
    }

    if ('sticky' == externalTabContainerOption) {
      const activeCookieStoreId = await activeContainerService.getActiveContainer(windowId);
      if (cookieStoreId == activeCookieStoreId || activeCookieStoreId == null) {
        console.log('Tab %d in active cookie store %s', tabId, cookieStoreId);
        return false;
      } else {
        browser.tabs.create({
          cookieStoreId: activeCookieStoreId,
          url,
          windowId,
        }).then(() => {
          console.log('Reopened %s in container id %s', url, activeCookieStoreId);
          return browser.tabs.remove(tabId);
        }).catch((e) => {
          console.error(e);
        });
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
