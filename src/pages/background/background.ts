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
import { Alarm } from 'weeg-utils';

import { ExternalServiceProvider } from '../../lib/ExternalServiceProvider';
import { ContainerTabOpenerService } from '../../lib/tabGroups/ContainerTabOpenerService';
import { PageLoaderService } from '../../lib/PageLoaderService';
import { ContainerCreatorService } from '../../lib/tabGroups/ContainerCreatorService';
import { TabSortingService } from '../../lib/tabs/TabSortingService';
import { SanityCheckService } from '../../lib/SenityCheckService';
import { StartupService } from '../../lib/StartupService';

import { UserContextVisibilityService } from '../../legacy-lib/userContexts/UserContextVisibilityService';

import './background-index-tab';
import './background-container-observer';
import './background-menus';
import './background-cookie-autoclean';
import './FramingHeadersService';
import './background-commands';
import './background-update-browserAction';
import './background-temporary-containers';
import './background-autodiscard';
import './background-storage-observer';
import './background-active-container';
import './background-redirector';

import '../../api/ApiDefinitions';
import '../../overrides/fetch';
import '../../overrides/language-content-script';
import { UaContentScriptRegistrar} from '../../overrides/UaContentScriptRegistrar';

// external services must be registered here
ExternalServiceProvider.getInstance();

// background services need to be instantiated here
// so that the listeners are registered
ContainerCreatorService.getInstance<ContainerCreatorService>();
PageLoaderService.getInstance<PageLoaderService>();
ContainerTabOpenerService.getInstance<ContainerTabOpenerService>();
const tabSortingService = TabSortingService.getInstance<TabSortingService>();

// must be instantiated here
new UaContentScriptRegistrar();

// other services used by this script
const userContextVisibilityService = UserContextVisibilityService.getInstance();
const sanityCheckService = SanityCheckService.getInstance();
const startupService = StartupService.getInstance();

const everyMinuteAlarm = new Alarm('background.everyMinute', {
  periodInMinutes: 1,
});

// auto reload the extension if the sanity check fails
everyMinuteAlarm.onAlarm.addListener(() => {
  sanityCheckService.checkForFiles().catch((e) => {
    console.error('Sanity check failed, reloading', e);
    browser.runtime.reload();
  });
});

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

startupService.onStartup.addListener(() => {
  tabSortingService.sortTabs().catch((e) => {
    console.error(e);
  });
});

everyMinuteAlarm.onAlarm.addListener(() => {
  tabSortingService.sortTabs().catch((e) => {
    console.error(e);
  });
});
