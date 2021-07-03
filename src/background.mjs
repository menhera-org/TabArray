// vim: ts=2 et ai

import * as containers from './modules/containers.mjs';

const PSL_URL = 'https://publicsuffix.org/list/public_suffix_list.dat';

fetch(PSL_URL).then(async res => {
	const data = await res.text();
	const lines = data.split('\n').map(line => line.trim()).filter(line => line != '' && !line.match(/^\/\//)).map(line => line.split(/\s/)[0]);
  console.log('PSL:', lines);
});


let tabSorting = false;

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
      sortTabsByWindow(windowId);
    }
  } catch (e) {
    console.error(e);
  } finally {
    tabSorting = false;
  }
};

browser.tabs.onAttached.addListener(() => {
  sortTabs();
});

browser.tabs.onCreated.addListener(() => {
  sortTabs();
});

browser.tabs.onMoved.addListener(() => {
  sortTabs(); // is this necessary?
});

browser.tabs.onRemoved.addListener(() => {
  sortTabs();
});

browser.tabs.onUpdated.addListener(() => {
  sortTabs();
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

