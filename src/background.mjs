// vim: ts=2 et ai

import * as containers from './modules/containers.mjs';

import {WebExtensionsBroadcastChannel} from './modules/broadcasting.mjs';

const PSL_URL = 'https://publicsuffix.org/list/public_suffix_list.dat';

let PSL_DATA;

const fetchPsl = async () => {
  const res = await fetch(PSL_URL);
  const data = await res.text();
  const lines = data.split('\n').map(line => line.trim()).filter(line => line != '' && !line.match(/^\/\//)).map(line => line.split(/\s/)[0]);
  console.log('PSL:', lines);
  PSL_DATA = lines;
};

fetchPsl().catch(e => console.error(e));

setInterval(() => {
  fetchPsl().catch(e => console.error(e));
}, 86400000); // one day

const tabChangeChannel = new WebExtensionsBroadcastChannel('tab_change');

let tabSorting = false;

const addBrowserActionBadge = (aWindowId) => {
  const windowId = 0 | aWindowId;
  browser.browserAction.setBadgeText({
    windowId,
    text: '#' + windowId,
  });
};

browser.windows.getAll({
  windowTypes: ['normal'],
}).then((windows) => {
  for (const window of windows) {
    addBrowserActionBadge(window.id);
  }
});

browser.windows.onCreated.addListener((window) => {
  addBrowserActionBadge(window.id);
});

// global browser action badge theme
browser.browserAction.setBadgeBackgroundColor({
  color: 'rgba(0, 0, 0, .75)',
});
browser.browserAction.setBadgeTextColor({
  color: 'rgba(255, 255, 255, .75)',
});

globalThis.getWindowIds = async () => {
  try {
    const windows = await browser.windows.getAll({
      populate: false,
      windowTypes: ['normal'],
    });
    return windows.map(window => window.id);
  } catch (e) {
    return [];
  }
};

globalThis.sortTabsByWindow = async (windowId) => {
  try {
    const tabs = await browser.tabs.query({windowId: windowId});
    const pinnedTabs = tabs.filter(tab => tab.pinned);
    const sortedTabs = tabs.filter(tab => !tab.pinned);
    sortedTabs.sort((tab1, tab2) => {
      const userContextId1 = containers.toUserContextId(tab1.cookieStoreId);
      const userContextId2 = containers.toUserContextId(tab2.cookieStoreId);
      return userContextId1 - userContextId2;
    });
    const pinnedCount = pinnedTabs.length;
    for (let i = 0; i < sortedTabs.length; i++) {
      const tab = sortedTabs[i];
      const currentIndex = tab.index;
      const targetIndex = pinnedCount + i;
      if (targetIndex != currentIndex) {
        await browser.tabs.move(tab.id, {index: targetIndex});
      }
    }
  } catch (e) {
    console.error(e);
  }
};

globalThis.sortTabs = async () => {
  if (tabSorting) return;
  tabSorting = true;
  try {
    for (const windowId of await getWindowIds()) {
      await sortTabsByWindow(windowId);
    }
  } catch (e) {
    console.error(e);
  } finally {
    tabSorting = false;
  }
};

browser.tabs.onAttached.addListener(async () => {
  await sortTabs();
  tabChangeChannel.postMessage(true);
});

browser.tabs.onCreated.addListener(async () => {
  await sortTabs();
  tabChangeChannel.postMessage(true);
});

browser.tabs.onMoved.addListener(async () => {
  await sortTabs();
  tabChangeChannel.postMessage(true);
});

browser.tabs.onUpdated.addListener(async () => {
  await sortTabs();
  tabChangeChannel.postMessage(true);
}, {
  properties: [
    'pinned',
  ],
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  //console.log('tab %d hidden on window %d', tabId, tab.windowId);
}, {
  properties: [
    'hidden',
  ],
});

browser.tabs.onActivated.addListener(async ({tabId, windowId}) => {
  //console.log('active tab changed on window %d', windowId);
  const tab = await browser.tabs.get(tabId);
  const userContextId = containers.toUserContextId(tab.cookieStoreId);
  if (!tab.pinned) {
    await containers.show(userContextId, windowId);
  }
});

browser.contextualIdentities.onRemoved.addListener(({contextualIdentity}) => {
  const userContextId = containers.toUserContextId(contextualIdentity.cookieStoreId);
  console.log('userContext %d removed', userContextId);
  containers.closeAllTabs(userContextId).then(() => {
    console.log('Closed all tabs for userContext %d', userContextId);
  }).catch(err => {
    console.error('cleanup failed for userContext %d', userContextId);
  });
});

sortTabs();

browser.menus.create({
  id: 'tab-hide-container',
  title: 'Hide this container',
  contexts: ['tab'],
});

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == 'tab-hide-container') {
    const userContextId = containers.toUserContextId(tab.cookieStoreId);
    containers.hide(userContextId, tab.windowId).catch(e => console.error(e));
  }
});
