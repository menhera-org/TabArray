// vim: ts=2 et ai

import * as containers from './modules/containers.mjs';

const PSL_URL = 'https://publicsuffix.org/list/public_suffix_list.dat';

fetch(PSL_URL).then(async res => {
	const data = await res.text();
	const lines = data.split('\n').map(line => line.trim()).filter(line => !line && !line.match(/^\/\//)).map(line => line.split(/\s/)[0]);
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
    const userContextIds = await containers.getIds();
    const tabs = await browser.tabs.query({windowId: windowId});
    const pinnedTabs = tabs.filter(tab => tab.pinned);
    const sortedTabs = tabs.filter(tab => !tab.pinned);
    sortedTabs.sort((tab1, tab2) => {
      const tab1Index = userContextIds.indexOf(tab1.cookieStoreId);
      const tab2Index = userContextIds.indexOf(tab2.cookieStoreId);
      return tab1Index - tab2Index;
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
  sortTabs();
});

browser.tabs.onRemoved.addListener(() => {
  sortTabs();
});

browser.tabs.onUpdated.addListener(() => {
  sortTabs();
}, {
  properties: [
    'hidden',
    'pinned',
  ],
});

sortTabs();

