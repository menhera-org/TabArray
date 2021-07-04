// vim: ts=2 et ai

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
  if (!aUserContextId) {
    return {
      cookieStoreId,
      name: 'No container',
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
      name: 'Unavailable container ' + userContextId,
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

export const closeAllTabs = async (aUserContextId) => {
  const tabIds = aUserContextId ? await getTabIds(aUserContextId) : await getTabIds(aUserContextId, true);
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
    name = 'Unnamed container';
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
      name: 'Container ' + userContextId,
    });
  }
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
