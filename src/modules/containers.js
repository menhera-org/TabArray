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
import * as newtab from './newtab';
import { setActiveUserContext } from './usercontext-state.js';
import { UserContext } from '../frameworks/tabGroups';
import { UserContextService } from '../userContexts/UserContextService';
import { TabGroupService } from '../frameworks/tabGroups';

const tabGroupService = TabGroupService.getInstance();

// 'never' -- do not show indices
// 'collapsed' -- show indices for collapsed containers
// 'always' -- always show indices
let configGroupIndexOption = 'never';
config['tab.groups.indexOption'].observe((value) => {
  configGroupIndexOption = value;
});

const PRIVILEGED_SCHEMES = new Set([
  'about',
  'chrome',
  'javascript',
  'data',
  'file',
]);

export const closeAllTabsOnWindow = async (aUserContextId, aWindowId) => {
  const tabGroup = await tabGroupService.getTabGroupFromUserContextId(aUserContextId);
  await tabGroup.closeUnpinnedTabsOnWindow(aWindowId);
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

export const hide = async (aUserContextId, aWindowId) => {
  if (!aWindowId) {
    throw new TypeError('Unimplemented');
  }
  const cookieStoreId = UserContext.toCookieStoreId(aUserContextId);
  const userContextId = UserContext.fromCookieStoreId(cookieStoreId);
  const tabs = await browser.tabs.query({
    windowId: aWindowId,
  });
  const userContexts = new Map;
  let active = false;
  const tabsToHide = [];
  let minIndex = Infinity;
  let indexExists = false;
  for (const tab of tabs) {
    if (tab.cookieStoreId != cookieStoreId || tab.pinned) {
      if (!tab.hidden) {
        userContexts.set(UserContext.fromCookieStoreId(tab.cookieStoreId), tab.id);
      }
      continue;
    }
    minIndex = Math.min(minIndex, tab.index);
    if (tab.active) {
      active = true;
    }
    if (!tab.hidden) {
      try {
        const indexTabUrl = await browser.sessions.getTabValue(tab.id, 'indexTabUrl');
        if (!indexTabUrl) {
          throw void 0;
        }
        indexExists = true;
      } catch (e) {
        tabsToHide.push(tab.id);
      }
    }
  }
  if (!indexExists && isFinite(minIndex) && 'collapsed' == configGroupIndexOption) {
    await createIndexTab(userContextId, aWindowId);
  }
  if (1 > tabsToHide.length) {
    console.log('No tabs to hide on window %d for userContext %d', aWindowId, userContextId);
    return;
  }
  if (active) {
    let success = false;
    for (const [, tabId] of userContexts) {
      await browser.tabs.update(tabId, {
        active: true,
      });
      success = true;
      break;
    }
    if (!success) {
      console.warn('Unable to hide this container %d because it is active and there is no other tab', userContextId);
      return;
    }
  }
  await browser.tabs.hide(tabsToHide);
};

export const show = async (aUserContextId, aWindowId) => {
  if (!aWindowId) {
    throw new TypeError('Unimplemented');
  }
  const cookieStoreId = UserContext.toCookieStoreId(aUserContextId);
  const userContextId = UserContext.fromCookieStoreId(cookieStoreId);
  const tabs = await browser.tabs.query({
    windowId: aWindowId,
    cookieStoreId,
  });
  if (1 > tabs.length) {
    console.log('No tabs to show on window %d for userContext %d', aWindowId, userContextId);
    return;
  }
  const tabsToShow = [];
  for (const tabObj of tabs) {
    try {
      const indexTabUrl = await browser.sessions.getTabValue(tabObj.id, 'indexTabUrl');
      if (!indexTabUrl) {
        throw void 0;
      }
      if ('collapsed' == configGroupIndexOption) {
        await browser.sessions.removeTabValue(tabObj.id, 'indexTabUrl');
        await browser.tabs.remove(tabObj.id);
      }
    } catch (e) {
      tabsToShow.push(tabObj.id);
    }
  }
  await browser.tabs.show(tabsToShow);
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
    await hide(userContextId, aWindowId);
  }
};

export const showAll = async (aWindowId) => {
  const tabIds = (await browser.tabs.query({
    windowId: aWindowId,
  })).map((tabObj) => tabObj.id);
  await browser.tabs.show(tabIds);
};

export const reopenInContainer = async (aUserContextId, aTabId) => {
  const tab = await browser.tabs.get(aTabId);
  if (tab.id != aTabId) {
    console.error('Tab mismatch');
    throw new Error('Tab mismatch');
  }
  const cookieStoreId = UserContext.toCookieStoreId(aUserContextId);
  const userContextId = UserContext.fromCookieStoreId(cookieStoreId);
  if (tab.cookieStoreId == cookieStoreId) return;
  const windowId = tab.windowId;
  const url = newtab.isPrivilegedNewTabPage(tab.url) ? undefined : tab.url;
  if (url) {
    const scheme = String(url).split(':')[0].toLowerCase();
    if (PRIVILEGED_SCHEMES.has(scheme)) {
      console.log('Ignoring privileged tab: %s', url);
      return;
    }
  }
  const containerTabs = await browser.tabs.query({
    pinned: false,
    cookieStoreId: cookieStoreId,
    windowId,
  });
  let lastIndex = undefined;
  for (const containerTab of containerTabs) {
    const index = containerTab.index;
    if (undefined === lastIndex) {
      lastIndex = index;
    } else {
      lastIndex = Math.max(lastIndex, index);
    }
  }
  console.log('reopenInContainer: userContext=%d, windowId=%d, tabId=%d, url=%s', userContextId, windowId, tab.id, url);
  await browser.tabs.remove(tab.id);
  if (undefined === lastIndex) {
    await browser.tabs.create({
      active: true,
      windowId,
      cookieStoreId,
      url,
    });
  } else {
    await browser.tabs.create({
      active: true,
      windowId,
      cookieStoreId,
      url,
      index: lastIndex + 1,
    });
  }
};

export const openNewTabInContainer = async (aUserContextId, aWindowId) => {
  const windowId = aWindowId;
  const cookieStoreId = UserContext.toCookieStoreId(aUserContextId);
  const userContextId = UserContext.fromCookieStoreId(cookieStoreId);
  setActiveUserContext(windowId, userContextId);
  const containerTabs = await browser.tabs.query({
    pinned: false,
    cookieStoreId: cookieStoreId,
    windowId,
  });
  let lastIndex = undefined;
  for (const containerTab of containerTabs) {
    const index = containerTab.index;
    if (undefined === lastIndex) {
      lastIndex = index;
    } else {
      lastIndex = Math.max(lastIndex, index);
    }
  }
  console.log('openNewTabInContainer: userContext=%d, windowId=%d', userContextId, windowId);
  if (undefined === lastIndex) {
    await browser.tabs.create({
      active: true,
      windowId,
      cookieStoreId,
    });
  } else {
    console.log('Inserting a new tab at index %d', lastIndex + 1);
    await browser.tabs.create({
      active: true,
      windowId,
      cookieStoreId,
      index: lastIndex + 1,
    });
  }
};
