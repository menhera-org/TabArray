// vim: ts=2 sw=2 et ai
/*
  Container Tab Groups
  Copyright (C) 2021 Menhera.org

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
import { config } from '../config/config';
import { IndexTab } from './IndexTab';
import { setActiveUserContext } from './usercontext-state.js';
import { UserContext } from '../frameworks/tabGroups';
import { UserContextService } from '../userContexts/UserContextService';
import { TabGroupService } from '../frameworks/tabGroups';
import { UserContextVisibilityService } from '../userContexts/UserContextVisibilityService';

const tabGroupService = TabGroupService.getInstance();
const userContextVisibilityService = UserContextVisibilityService.getInstance();

// 'never' -- do not show indices
// 'collapsed' -- show indices for collapsed containers
// 'always' -- always show indices
let configGroupIndexOption = 'never';
config['tab.groups.indexOption'].observe((value) => {
  configGroupIndexOption = value;
});

export const closeAllTabsOnWindow = async (aUserContextId, aWindowId) => {
  const tabGroup = await tabGroupService.getTabGroupFromUserContextId(aUserContextId);
  await tabGroup.tabList.closeUnpinnedTabsOnWindow(aWindowId);
};

export const createIndexTab = async (aUserContextId, aWindowId) => {
  const rawUserContext = await UserContext.get(aUserContextId);
  const userContext = UserContextService.getInstance().fillDefaultValues(rawUserContext);
  const url = IndexTab.getUrl(userContext.name, userContext.icon, userContext.colorCode).url;
  const tabObj = await browser.tabs.create({
    url,
    cookieStoreId: UserContext.toCookieStoreId(aUserContextId),
    windowId: aWindowId,
    active: false,
  });
  await browser.sessions.setTabValue(tabObj.id, 'indexTabUrl', url);
  return tabObj;
};

export const getInactiveIds = async (aWindowId) => {
  const tabs = await browser.tabs.query({
    windowId: aWindowId,
    pinned: false,
  });
  const userContextIds = new Set([... tabs].map((tab) => UserContext.fromCookieStoreId(tab.cookieStoreId)));
  for (const tab of tabs) {
    const userContextId = UserContext.fromCookieStoreId(tab.cookieStoreId);
    if (tab.active) {
      userContextIds.delete(userContextId);
    }
  }
  return [... userContextIds].sort((a, b) => a - b);
};

export const hideAll = async (aWindowId) => {
  const userContextIds = await getInactiveIds(aWindowId);
  for (const userContextId of userContextIds) {
    await userContextVisibilityService.hideContainerOnWindow(aWindowId, userContextId);
  }
};

export const showAll = async (aWindowId) => {
  const tabIds = (await browser.tabs.query({
    windowId: aWindowId,
  })).map((tabObj) => tabObj.id);
  await browser.tabs.show(tabIds);
};

export const reopenInContainer = async (aUserContextId, aTabId) => {
  const tabGroup = await tabGroupService.getTabGroupFromUserContextId(aUserContextId);
  await tabGroup.reopenTabInGroup(aTabId);
};

export const openNewTabInContainer = async (aUserContextId, aWindowId) => {
  const windowId = aWindowId;
  const cookieStoreId = UserContext.toCookieStoreId(aUserContextId);
  const userContextId = UserContext.fromCookieStoreId(cookieStoreId);
  setActiveUserContext(windowId, userContextId);
  const tabGroup = await tabGroupService.getTabGroupFromUserContextId(userContextId);
  console.log('openNewTabInContainer: userContext=%d, windowId=%d', userContextId, windowId);
  await tabGroup.openTabOnWindow(windowId);
};
