// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2023 Menhera.org

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
import { ExtensionService } from 'weeg-utils';
import { SetMap } from 'weeg-types';
import { CompatTab } from 'weeg-tabs';
import { DisplayedContainer } from 'weeg-containers';

import { DisplayedContainerService } from '../../lib/tabGroups/DisplayedContainerService';
import { TabGroupDirectory } from '../../lib/tabGroups/TabGroupDirectory';
import { UserContext } from '../tabGroups';
import { Tab } from './Tab';
import { WindowStateSnapshot } from './WindowStateSnapshot';
import { FirstPartyService } from '../tabGroups';
import { ContainersStateSnapshot } from './ContainersStateSnapshot';
import { TabGroupDirectorySnapshot } from '../../lib/tabGroups/TabGroupDirectorySnapshot';
import { TabAttributeMap } from '../../lib/tabGroups/TabAttributeMap';

const tabGroupDirectory = new TabGroupDirectory();
const firstPartyService = FirstPartyService.getInstance();
const extensionService = ExtensionService.getInstance();
const displayedContainerService = DisplayedContainerService.getInstance();

export class BrowserStateSnapshot {
  public static async create(): Promise<BrowserStateSnapshot> {
    const [userContexts, browserWindows, currentBrowserWindow, displayedContainers, enabledInPrivateBrowsing, tabGroupDirectorySnapshot] = await Promise.all([
      UserContext.getAll(),
      browser.windows.getAll({
        populate: true,
        windowTypes: ['normal'],
      }),
      browser.windows.get(browser.windows.WINDOW_ID_CURRENT),
      displayedContainerService.getDisplayedContainers(),
      extensionService.isAllowedInPrivateBrowsing(),
      tabGroupDirectory.getSnapshot(),
      firstPartyService.initialized,
    ]);
    if (null == currentBrowserWindow.id) {
      throw new Error('currentBrowserWindow.id is null');
    }
    const compatTabMap = new Map<number, CompatTab>();
    for (const browserWindow of browserWindows) {
      if (browserWindow.tabs == null) continue;
      for (const browserTab of browserWindow.tabs) {
        if (browserTab.id == null) continue;
        compatTabMap.set(browserTab.id, new CompatTab(browserTab));
      }
    }

    const tabAttributeMap = await TabAttributeMap.create(compatTabMap.values());
    return new BrowserStateSnapshot(userContexts, browserWindows, currentBrowserWindow.id, displayedContainers, enabledInPrivateBrowsing, tabGroupDirectorySnapshot, tabAttributeMap);
  }

  public readonly currentWindowId: number;
  public readonly enabledInPrivateBrowsing;

  private readonly _tabAttributeMap: TabAttributeMap;
  private readonly _tabMap: Map<number, Tab> = new Map();
  private readonly _tabIds: number[];
  private readonly _tabsByWindow: Map<number, Tab[]> = new Map();
  private readonly _privateWindowIds: Set<number> = new Set();
  private readonly _windowIds = new Set<number>();
  private readonly _windowStateSnapshots: Map<number, WindowStateSnapshot> = new Map();
  private readonly _definedUserContexts: readonly UserContext[];
  private readonly _containersStateSnapshot: ContainersStateSnapshot;
  private readonly _tabGroupDirectorySnapshot: TabGroupDirectorySnapshot;

  public constructor(userContexts: UserContext[], browserWindows: browser.Windows.Window[], currentWindowId: number, displayedContainers: DisplayedContainer[], enabledInPrivateBrowsing: boolean, tabGroupDirectorySnapshot: TabGroupDirectorySnapshot, tabAttributeMap: TabAttributeMap) {
    this.currentWindowId = currentWindowId;
    this._definedUserContexts = userContexts;
    this.enabledInPrivateBrowsing = enabledInPrivateBrowsing;
    this._tabAttributeMap = tabAttributeMap;
    const tabs: Tab[] = [];
    for (const browserWindow of browserWindows) {
      if (browserWindow.tabs == null || browserWindow.id == null) {
        throw new Error('Invalid browserWindow');
      }
      this._windowIds.add(browserWindow.id);
      if (browserWindow.incognito) {
        this._privateWindowIds.add(browserWindow.id);
      }
      const windowTabs: Tab[] = [];
      this._tabsByWindow.set(browserWindow.id, windowTabs);
      for (const browserTab of browserWindow.tabs) {
        const tab = new Tab(browserTab);
        this._tabMap.set(tab.id, tab);
        windowTabs.push(tab);
        tabs.push(tab);
      }
    }
    this._tabIds = Array.from(this._tabMap.keys()).sort((a, b) => a - b);
    this._containersStateSnapshot = new ContainersStateSnapshot(displayedContainers, tabs, tabGroupDirectorySnapshot);
    this._tabGroupDirectorySnapshot = tabGroupDirectorySnapshot;
  }

  public getWindowIds(): number[] {
    return Array.from(this._windowIds).sort((a, b) => a - b);
  }

  public getWindowStateSnapshot(windowId: number): WindowStateSnapshot {
    const cachedSnapshot = this._windowStateSnapshots.get(windowId);
    if (cachedSnapshot != null) {
      return cachedSnapshot;
    }

    const tabs = this._tabsByWindow.get(windowId) ?? [];
    const isPrivate = this._privateWindowIds.has(windowId);
    const snapshot = new WindowStateSnapshot(windowId, isPrivate, tabs);
    this._windowStateSnapshots.set(windowId, snapshot);
    return snapshot;
  }

  public getFirstPartyStateSnapshot(isPrivate: boolean): ReadonlyMap<string, ReadonlySet<Tab>> {
    const tabs = this._tabMap.values();
    const map = new SetMap<string, Tab>((item) => item.id);
    for (const tab of tabs) {
      if (tab.isPrivate() != isPrivate) continue;
      map.addItem(tab.originAttributes.firstpartyDomain, tab);
    }
    return map;
  }

  public getDefinedUserContexts(): readonly UserContext[] {
    return this._definedUserContexts;
  }

  public getContainersStateSnapshot(): ContainersStateSnapshot {
    return this._containersStateSnapshot;
  }

  public getTabGroupDirectorySnapshot(): TabGroupDirectorySnapshot {
    return this._tabGroupDirectorySnapshot;
  }

  public getTabAttributeMap(): TabAttributeMap {
    return this._tabAttributeMap;
  }
}
