// vim: ts=2 et ai

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

export const getTabIds = async (aUserContextId) => {
  const cookieStoreId = toCookieStoreId(aUserContextId);
  const tabs = await browser.tabs.query({
    cookieStoreId,
  });
  if (!tabs) {
    throw new TypeError('Failed to query tabs');
  }
  return [... tabs].map((tab) => 0 | tab.id);
};

export const closeAllTabs = async (aUserContextId) => {
  const tabIds = await getTabIds(aUserContextId);
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


