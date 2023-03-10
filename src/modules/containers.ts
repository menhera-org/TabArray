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
import { setActiveUserContext } from './usercontext-state.js';
import { UserContext } from '../frameworks/tabGroups';
import { TabGroupService } from '../frameworks/tabGroups';
import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';
import { Uint32 } from '../frameworks/types';
import { WindowService } from '../frameworks/tabs/WindowService';

const tabGroupService = TabGroupService.getInstance();
const userContextVisibilityService = UserContextVisibilityService.getInstance();
const windowService = WindowService.getInstance();

export const closeAllTabsOnWindow = async (aUserContextId: Uint32.Uint32, aWindowId: number) => {
  const isPrivate = await windowService.isPrivateWindow(aWindowId);
  const tabGroup = await (isPrivate ? tabGroupService.getPrivateBrowsingTabGroup() : tabGroupService.getTabGroupFromUserContextId(aUserContextId));
  await tabGroup.tabList.closeUnpinnedTabsOnWindow(aWindowId);
};

export const getInactiveIds = async (aWindowId: number) => {
  const tabs = await browser.tabs.query({
    windowId: aWindowId,
    pinned: false,
  });
  const userContextIds = new Set([... tabs].map((tab) => tab.cookieStoreId ? UserContext.fromCookieStoreId(tab.cookieStoreId) : UserContext.ID_DEFAULT));
  for (const tab of tabs) {
    if (!tab.cookieStoreId) continue;
    const userContextId = UserContext.fromCookieStoreId(tab.cookieStoreId);
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

export const reopenInContainer = async (aUserContextId: Uint32.Uint32, aTabId: number, isPrivate = false) => {
  const tabGroup = await (isPrivate ? tabGroupService.getPrivateBrowsingTabGroup() : tabGroupService.getTabGroupFromUserContextId(aUserContextId));
  await tabGroup.reopenTabInGroup(aTabId);
};

export const openNewTabInContainer = async (aUserContextId: Uint32.Uint32, aWindowId: number) => {
  const isPrivate = await windowService.isPrivateWindow(aWindowId);
  if (isPrivate) {
    await browser.tabs.create({
      windowId: aWindowId,
    });
    return;
  }
  const windowId = aWindowId;
  const cookieStoreId = UserContext.toCookieStoreId(aUserContextId);
  const userContextId = UserContext.fromCookieStoreId(cookieStoreId);
  setActiveUserContext(windowId, userContextId);
  const tabGroup = await tabGroupService.getTabGroupFromUserContextId(userContextId);
  console.log('openNewTabInContainer: userContext=%d, windowId=%d', userContextId, windowId);
  await tabGroup.openTabOnWindow(windowId);
};
