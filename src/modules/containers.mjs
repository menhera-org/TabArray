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

import * as newtab from './newtab.mjs';
import { setActiveUserContext } from './usercontext-state.mjs';

const COLORS = [
  "blue",
  "turquoise",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "toolbar",
];

const ICONS = [
  "fingerprint",
  "briefcase",
  "dollar",
  "cart",
  "circle",
  "gift",
  "vacation",
  "food",
  "fruit",
  "pet",
  "tree",
  "chill",
  "fence",
];

const PRIVILEGED_SCHEMES = new Set([
  'about',
  'chrome',
  'javascript',
  'data',
  'file',
]);

export const toCookieStoreId = (aUserContextId) => {
  const userContextId = Math.max(0, 0 | aUserContextId);
  if (userContextId) {
    return 'firefox-container-' + userContextId;
  } else {
    return 'firefox-default';
  }
};

export const toUserContextId = (aCookieStoreId) => {
  if ('number' == typeof aCookieStoreId) {
    return Math.max(0, 0 | aCookieStoreId);
  }
  const matches = String(aCookieStoreId || '').match(/^firefox-container-([0-9]+)$/);
  if (!matches) {
    return 0;
  } else {
    return 0 | matches[1];
  }
};

export const getIds = async () => {
  try {
    const containers = await browser.contextualIdentities.query({});
    return [... new Set([... containers].map(container => toUserContextId(container.cookieStoreId)))];
  } catch (e) {
    console.error('userContext disabled?');
    return [];
  }
};

export const getActiveIds = async () => {
  const tabs = await browser.tabs.query({});
  const ids = [... tabs].map(tab => toUserContextId(tab.cookieStoreId));
  ids.sort((a, b) => a - b);
  return [... new Set(ids)];
};

export const get = async (aUserContextId) => {
  const cookieStoreId = toCookieStoreId(aUserContextId);
  const userContextId = toUserContextId(cookieStoreId);
  if (!userContextId) {
    return {
      cookieStoreId,
      name: browser.i18n.getMessage('noContainer'),
    };
  }
  try {
    const contextualIdentity = await browser.contextualIdentities.get(cookieStoreId);
    if (!contextualIdentity) {
      throw new TypeError('Invalid container object');
    }
    return contextualIdentity;
  } catch (e) {
    // userContext disabled or nonexsistent id
    return {
      cookieStoreId,
      name: browser.i18n.getMessage('invalidContainerName', userContextId),
    };
  }
};

export const getIndex = async (aId) => {
  const userContextIds = await getIds();
  return userContextIds.indexOf(aId);
};

export const getTabIds = async (aUserContextId, aExcludePinned) => {
  const cookieStoreId = toCookieStoreId(aUserContextId);
  const tabs = await browser.tabs.query({
    cookieStoreId,
  });
  if (!tabs) {
    throw new TypeError('Failed to query tabs');
  }
  return [... tabs].filter((tab) => !aExcludePinned || !tab.pinned).map((tab) => 0 | tab.id);
};

export const closeAllTabs = async (aUserContextId, aExcludePinned) => {
  const tabIds = aUserContextId ? await getTabIds(aUserContextId, !!aExcludePinned) : await getTabIds(aUserContextId, true);
  console.log('Closing %d tab(s)', tabIds.length);
  if (tabIds.length) {
    await browser.tabs.remove(tabIds);
  }
};

export const closeAllTabsOnWindow = async (aUserContextId, aWindowId) => {
  const cookieStoreId = toCookieStoreId(aUserContextId);
  const userContextId = toUserContextId(cookieStoreId);
  const tabIds = (await browser.tabs.query({
    windowId: aWindowId,
    pinned: false,
    cookieStoreId,
  })).map((tabObj) => tabObj.id);
  console.log('Closing %d tab(s)', tabIds.length);
  if (tabIds.length) {
    await browser.tabs.remove(tabIds);
  }
};

export const remove = async (aUserContextId) => {
  try {
    await closeAllTabs(aUserContextId);
    const userContextIds = await getIds();
    if (!userContextIds.includes(aUserContextId)) return;
    const cookieStoreId = toCookieStoreId(aUserContextId);
    await browser.contextualIdentities.remove(cookieStoreId);
  } catch (e) {
    console.error(e);
  }
};

export const create = async (aName, aColor, aIcon) => {
  let name = String(aName).trim();
  let color = String(aColor).toLowerCase();
  if (!COLORS.includes(color)) {
    color = COLORS[0];
  }
  let icon = String(aIcon).toLowerCase();
  if (!ICONS.includes(icon)) {
    icon = ICONS[0];
  }

  const isUnnamed = '' === name;
  if (isUnnamed) {
    name = '_unnamed_container_';
  }
  const contextualIdentity = await browser.contextualIdentities.create({
    name,
    color,
    icon,
  });
  const userContextId = toUserContextId(contextualIdentity.cookieStoreId);
  console.log('userContext %d created', userContextId);
  if (isUnnamed) {
    await browser.contextualIdentities.update(contextualIdentity.cookieStoreId, {
      name: browser.i18n.getMessage('defaultContainerName', userContextId),
    });
  }
};

export const updateProperties = async (aUserContextId, aName, aColor, aIcon) => {
  let name = String(aName).trim();
  let color = String(aColor).toLowerCase();
  if (!COLORS.includes(color)) {
    color = COLORS[0];
  }
  let icon = String(aIcon).toLowerCase();
  if (!ICONS.includes(icon)) {
    icon = ICONS[0];
  }

  const cookieStoreId = toCookieStoreId(aUserContextId);
  const userContextId = toUserContextId(cookieStoreId);
  const isUnnamed = '' === name;
  if (isUnnamed) {
    name = browser.i18n.getMessage('defaultContainerName', userContextId);
  }
  await browser.contextualIdentities.update(cookieStoreId, {
    name,
    color,
    icon,
  });
};

export const hide = async (aUserContextId, aWindowId) => {
  if (!aWindowId) {
    throw new TypeError('Unimplemented');
  }
  const cookieStoreId = toCookieStoreId(aUserContextId);
  const userContextId = toUserContextId(cookieStoreId);
  const tabs = await browser.tabs.query({
    windowId: aWindowId,
  });
  const userContexts = new Map;
  let active = false;
  const tabsToHide = [];
  for (const tab of tabs) {
    if (tab.cookieStoreId != cookieStoreId || tab.pinned) {
      if (!tab.hidden) {
        userContexts.set(toUserContextId(tab.cookieStoreId), tab.id);
      }
      continue;
    }
    if (tab.active) {
      active = true;
    }
    if (!tab.hidden) {
      tabsToHide.push(tab.id);
    }
  }
  if (1 > tabsToHide.length) {
    console.log('No tabs to hide on window %d for userContext %d', aWindowId, userContextId);
    return;
  }
  if (active) {
    let success = false;
    for (const [otherUserContextId, tabId] of userContexts) {
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
  const cookieStoreId = toCookieStoreId(aUserContextId);
  const userContextId = toUserContextId(cookieStoreId);
  const tabs = await browser.tabs.query({
    windowId: aWindowId,
    cookieStoreId,
  });
  if (1 > tabs.length) {
    console.log('No tabs to show on window %d for userContext %d', aWindowId, userContextId);
    return;
  }
  const tabIds = [... tabs].map((tab) => 0 | tab.id);
  await browser.tabs.show(tabIds);
};

export const getInactiveIds = async (aWindowId) => {
  const tabs = await browser.tabs.query({
    windowId: aWindowId,
    pinned: false,
  });
  const userContextIds = new Set([... tabs].map((tab) => toUserContextId(tab.cookieStoreId)));
  for (const tab of tabs) {
    const userContextId = toUserContextId(tab.cookieStoreId);
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
  const cookieStoreId = toCookieStoreId(aUserContextId);
  const userContextId = toUserContextId(cookieStoreId);
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
  const cookieStoreId = toCookieStoreId(aUserContextId);
  const userContextId = toUserContextId(cookieStoreId);
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
