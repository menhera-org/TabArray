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

import { TabSortingService } from '../lib/tabs/TabSortingService';
import { StartupService } from '../lib/StartupService';
import { OpenTabsService } from '../lib/states/OpenTabsService';

const tabSortingService = TabSortingService.getInstance<TabSortingService>();
const startupService = StartupService.getInstance();
const openTabsService = OpenTabsService.getInstance();

browser.tabs.onAttached.addListener(() => {
  tabSortingService.sortTabs().catch((e) => {
    console.error(e);
  });
});

openTabsService.onTabCreated.addListener(() => {
  tabSortingService.sortTabs().catch((e) => {
    console.error(e);
  });
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
  tabSortingService.sortTabs().catch((e) => {
    console.error(e);
  });
}, {
  properties: [
    'pinned',
  ],
});

startupService.onStartup.addListener(() => {
  tabSortingService.sortTabs().catch((e) => {
    console.error(e);
  });
});
