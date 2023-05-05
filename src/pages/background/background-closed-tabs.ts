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
import { CompatTab } from 'weeg-tabs';

import { ContextualIdentityService } from '../../lib/tabGroups/ContextualIdentityService';
import { TemporaryContainerService } from '../../lib/tabGroups/TemporaryContainerService';
import { CompatConsole } from '../../lib/console/CompatConsole';
import { TabGroupService } from '../../lib/tabGroups/TabGroupService';
import { OpenTabState } from '../../lib/tabGroups/OpenTabState';
import { InitialWindowsService } from './InitialWindowsService';

const contextualIdentityService = ContextualIdentityService.getInstance();
const contextualIdentityFactory = contextualIdentityService.getFactory();
const temporatyContainerService = TemporaryContainerService.getInstance();
const initialWindowsService = InitialWindowsService.getInstance();

const openTabs = new OpenTabState();

const console = new CompatConsole(CompatConsole.tagFromFilename(__filename));
const tabGroupService = TabGroupService.getInstance();

contextualIdentityFactory.onRemoved.addListener(async (identity) => {
  temporatyContainerService.removeTemporaryContainerFromList(identity.cookieStore.id);
});

browser.tabs.onCreated.addListener((browserTab) => {
  if (browserTab.cookieStoreId == null || browserTab.id == null) return;
  console.debug('Tab created', browserTab.cookieStoreId, browserTab.id);
  openTabs.addTabId(browserTab.cookieStoreId, browserTab.id);
});

initialWindowsService.getInitialWindows().then((browserWindows) => {
  const tabs: CompatTab[] = [];
  for (const browserWindow of browserWindows) {
    if (!browserWindow.tabs) continue;
    tabs.push(... browserWindow.tabs.map((browserTab) => new CompatTab(browserTab)));
  }
  openTabs.setInitialTabs(tabs);
});

browser.tabs.onRemoved.addListener(async (tabId) => {
  try {
    openTabs.removeTabId(tabId);
  } catch (e) {
    console.error(e);
  }
});

openTabs.onContainerClosed.addListener((cookieStoreId) => {
  temporatyContainerService.isTemporaryContainer(cookieStoreId).then(async (isTemporaryContainer) => {
    if (isTemporaryContainer) {
      await temporatyContainerService.removeTemporaryContainer(cookieStoreId);
    }
  }).catch((e) => {
    console.error(e);
  });

  tabGroupService.optionDirectory.getAutocleanEnabledTabGroupIds().then(async (tabGroupIds) => {
    if (tabGroupIds.includes(cookieStoreId)) {
      console.info('Removing browsing data for tab group', cookieStoreId);
      await tabGroupService.removeBrowsingDataForTabGroupId(cookieStoreId);
    }
  }).catch((e) => {
    console.error(e);
  })
});
