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

import browser from 'webextension-polyfill';
import { Uint32 } from "weeg-types";
import { CookieStore } from 'weeg-containers';
import { CompatTab } from 'weeg-tabs';

import { TabQueryService } from '../../lib/tabs/TabQueryService';
import { TabService } from '../../lib/tabs/TabService';

import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';
import { WindowService } from '../tabs/WindowService';

const tabQueryService = TabQueryService.getInstance();
const tabService = TabService.getInstance();
const userContextVisibilityService = UserContextVisibilityService.getInstance();
const windowService = WindowService.getInstance();

/**
 * Close all unpinned tabs in a window with a given userContextId.
 */
export const closeAllTabsOnWindow = async (aUserContextId: Uint32.Uint32, aWindowId: number) => {
  const cookieStore = CookieStore.fromParams({
    userContextId: aUserContextId,
    privateBrowsingId: 0 as Uint32.Uint32,
  });
  const isPrivate = await windowService.isPrivateWindow(aWindowId);
  const cookieStoreId = isPrivate ? CookieStore.PRIVATE.id : cookieStore.id;
  const tabs = await tabQueryService.queryTabs({
    tabGroupId: cookieStoreId,
    windowId: aWindowId,
    pinned: false,
  });
  if (tabs.length > 0) {
    await tabService.closeTabs(tabs);
  }
};

export const getInactiveIds = async (aWindowId: number) => {
  const browserTabs = await browser.tabs.query({
    windowId: aWindowId,
    pinned: false,
  });
  const tabs = browserTabs.map((browserTab) => new CompatTab(browserTab));
  const userContextIds = new Set([... tabs].map((tab) => tab.cookieStore.userContextId));
  for (const tab of tabs) {
    const userContextId = tab.cookieStore.userContextId;
    if (tab.active) {
      userContextIds.delete(userContextId);
    }
  }
  return [... userContextIds].sort((a, b) => a - b);
};

export const hideAll = async (aWindowId: number) => {
  const isPrivate = await windowService.isPrivateWindow(aWindowId);
  if (isPrivate) {
    console.log('hideAll: skip for private window');
    return;
  }
  const userContextIds = await getInactiveIds(aWindowId);
  for (const userContextId of userContextIds) {
    await userContextVisibilityService.hideContainerOnWindow(aWindowId, userContextId);
  }
};
