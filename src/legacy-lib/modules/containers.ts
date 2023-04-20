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
import { CookieStore } from 'weeg-containers';
import { CompatTab } from 'weeg-tabs';

import { TabQueryService } from '../../lib/tabs/TabQueryService';
import { TabService } from '../../lib/tabs/TabService';

import { ContainerVisibilityService } from '../../lib/tabGroups/ContainerVisibilityService';
import { WindowService } from '../tabs/WindowService';

const tabQueryService = TabQueryService.getInstance();
const tabService = TabService.getInstance();
const userContextVisibilityService = ContainerVisibilityService.getInstance();
const windowService = WindowService.getInstance();

/**
 * Close all unpinned tabs in a window with a given userContextId.
 */
export const closeAllTabsOnWindow = async (aCookieStoreId: string, aWindowId: number) => {
  const cookieStore = new CookieStore(aCookieStoreId);
  const isPrivate = await windowService.isPrivateWindow(aWindowId);
  if (isPrivate && !cookieStore.isPrivate) {
    console.warn('closeAllTabsOnWindow: cannot close non-private tabs in private window');
    return;
  }
  const cookieStoreId = cookieStore.id;
  const tabs = await tabQueryService.queryTabs({
    tabGroupId: cookieStoreId,
    windowId: aWindowId,
    pinned: false,
  });
  if (tabs.length > 0) {
    await tabService.closeTabs(tabs);
  }
};

const getInactiveIds = async (aWindowId: number) => {
  const browserTabs = await browser.tabs.query({
    windowId: aWindowId,
    pinned: false,
  });
  const tabs = browserTabs.map((browserTab) => new CompatTab(browserTab));
  const cookieStoreIds = new Set([... tabs].map((tab) => tab.cookieStore.id));
  for (const tab of tabs) {
    const cookieStoreId = tab.cookieStore.id;
    if (tab.active) {
      cookieStoreIds.delete(cookieStoreId);
    }
  }
  return [... cookieStoreIds];
};

export const hideAll = async (aWindowId: number) => {
  const isPrivate = await windowService.isPrivateWindow(aWindowId);
  if (isPrivate) {
    console.log('hideAll: skip for private window');
    return;
  }
  const cookieStoreIds = await getInactiveIds(aWindowId);
  const promises: Promise<void>[] = [];
  for (const cookieStoreId of cookieStoreIds) {
    promises.push(userContextVisibilityService.hideContainerOnWindow(aWindowId, cookieStoreId));
  }
  await Promise.all(promises);
};
