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
import { Tab } from "../tabs";

/**
 * Readonly list of Tab IDs.
 */
export class TabList {
  private readonly _tabIds: ReadonlyArray<number>;

  constructor(tabIds: Iterable<number>) {
    this._tabIds = [...tabIds];
  }

  public get length() {
    return this._tabIds.length;
  }

  public indexOf(tabId: number): number {
    return this._tabIds.indexOf(tabId);
  }

  public hasTabId(tabId: number): boolean {
    return this._tabIds.includes(tabId);
  }

  public async getTabs(): Promise<Tab[]> {
    const tabs = [];
    for (const tabId of this._tabIds) {
      try {
        const tab = await Tab.get(tabId);
        tabs.push(tab);
      } catch (e) {
        // ignore.
        console.log('Missing tab', tabId);
      }
    }
    return tabs;
  }

  public async getUnpinnedTabs(): Promise<Tab[]> {
    const tabs = await this.getTabs();
    return tabs.filter((tab) => !tab.pinned);
  }

  private async closeTabsByIds(tabIds: number[]): Promise<void> {
    await browser.tabs.remove(tabIds);
  }

  public async closeTabs(): Promise<void> {
    await this.closeTabsByIds(Array.from(this._tabIds));
  }

  public async closeUnpinnedTabs(): Promise<void> {
    const tabs = await this.getTabs();
    const tabIds = [];
    for (const tab of tabs) {
      if (!tab.pinned) {
        tabIds.push(tab.id);
      }
    }
    await this.closeTabsByIds(tabIds);
  }

  public async closeUnpinnedTabsOnWindow(windowId: number): Promise<void> {
    const tabs = await this.getTabs();
    const tabIds = [];
    for (const tab of tabs) {
      if (!tab.pinned && tab.windowId === windowId) {
        tabIds.push(tab.id);
      }
    }
    await this.closeTabsByIds(tabIds);
  }

  public async getLastIndexOnWindow(windowId: number): Promise<number | undefined> {
    const tabs = await this.getUnpinnedTabs();
    let lastIndex: number | undefined = undefined;
    for (const tab of tabs) {
      if (tab.windowId === windowId && (lastIndex === undefined || lastIndex < tab.index)) {
        lastIndex = tab.index;
      }
    }
    return lastIndex;
  }
}
