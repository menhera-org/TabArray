// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
import { Tab } from '../frameworks/tabs';
import { getWindowIds } from '../modules/windows';
import { IndexTab } from '../modules/IndexTab';
import { UserContextSortingOrderStore } from '../userContexts/UserContextSortingOrderStore';

const userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();

let tabSorting = false;

const tabSortingCallback = (tab1: Tab, tab2: Tab) => {
  const userContextId1 = tab1.userContextId;
  const userContextId2 = tab2.userContextId;
  const order = userContextSortingOrderStore.sortingCallback(userContextId1, userContextId2);
  if (order == 0) {
    if (IndexTab.isIndexTabUrl(tab1.url)) {
      return -1;
    }
    if (IndexTab.isIndexTabUrl(tab2.url)) {
      return 1;
    }
  }
  return order;
};

const sortTabsByWindow = async (windowId: number) => {
  try {
    const browserTabs = await browser.tabs.query({windowId: windowId});
    const tabs = browserTabs.map((tab) => new Tab(tab));
    const pinnedTabs = tabs.filter(tab => tab.pinned);
    const sortedTabs = tabs.filter(tab => !tab.pinned);

    sortedTabs.sort(tabSortingCallback);

    const pinnedCount = pinnedTabs.length;
    for (let i = 0; i < sortedTabs.length; i++) {
      const tab = sortedTabs[i];
      if (undefined == tab || null == tab.index || null == tab.id) continue;
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

const sortTabs = async () => {
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

userContextSortingOrderStore.onChanged.addListener(sortTabs);

export class TabSortingService {
  private static readonly INSTANCE = new TabSortingService();

  public static getInstance(): TabSortingService {
    return TabSortingService.INSTANCE;
  }

  private constructor() {
    // nothing.
  }

  public async sortTabs() {
    await sortTabs();
  }
}
