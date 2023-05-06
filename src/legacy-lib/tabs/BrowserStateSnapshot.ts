/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
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
  @license
**/

import { SetMap } from 'weeg-types';
import { CompatTab } from 'weeg-tabs';
import { DisplayedContainer } from 'weeg-containers';
import { Asserts } from 'weeg-utils';

import { WindowStateSnapshot } from './WindowStateSnapshot';
import { ContainersStateSnapshot } from './ContainersStateSnapshot';
import { TabGroupDirectorySnapshot } from '../../lib/tabGroups/TabGroupDirectorySnapshot';
import { TabAttributeMap } from '../../lib/tabGroups/TabAttributeMap';
import { BrowserStateService, BrowserStateConstructParams } from '../../lib/states/BrowserStateService';

const browserStateService = BrowserStateService.getInstance();

export class BrowserStateSnapshot {
  public static async create(): Promise<BrowserStateSnapshot> {
    Asserts.assertNotBackgroundScript();
    const constructParams = await browserStateService.getConstructParams();
    return new BrowserStateSnapshot(constructParams);
  }

  public readonly currentWindowId: number;
  public readonly enabledInPrivateBrowsing;

  private readonly _tabAttributeMap: TabAttributeMap;
  private readonly _tabMap: Map<number, CompatTab> = new Map();
  private readonly _tabIds: number[];
  private readonly _tabsByWindow: Map<number, CompatTab[]> = new Map();
  private readonly _privateWindowIds: Set<number> = new Set();
  private readonly _windowIds = new Set<number>();
  private readonly _windowStateSnapshots: Map<number, WindowStateSnapshot> = new Map();
  private readonly _containersStateSnapshot: ContainersStateSnapshot;
  private readonly _tabGroupDirectorySnapshot: TabGroupDirectorySnapshot;
  private readonly _registrableDomainMap: Map<string, string>;
  private readonly _displayedContainers: DisplayedContainer[];

  public constructor(params: BrowserStateConstructParams) {
    const {
      browserWindows,
      currentWindowId,
      displayedContainers,
      enabledInPrivateBrowsing,
      tabGroupDirectorySnapshot,
      tabAttributeMap,
      registrableDomainMap,
    } = params;

    this._displayedContainers = displayedContainers;
    this._registrableDomainMap = registrableDomainMap;
    this.currentWindowId = currentWindowId;
    this.enabledInPrivateBrowsing = enabledInPrivateBrowsing;
    this._tabAttributeMap = tabAttributeMap;
    const tabs: CompatTab[] = [];
    for (const browserWindow of browserWindows) {
      if (browserWindow.tabs == null || browserWindow.id == null) {
        throw new Error('Invalid browserWindow');
      }
      this._windowIds.add(browserWindow.id);
      if (browserWindow.incognito) {
        this._privateWindowIds.add(browserWindow.id);
      }
      const windowTabs: CompatTab[] = [];
      this._tabsByWindow.set(browserWindow.id, windowTabs);
      for (const browserTab of browserWindow.tabs) {
        const tab = new CompatTab(browserTab);
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

  public getFirstPartyStateSnapshot(isPrivate: boolean): ReadonlyMap<string, ReadonlySet<CompatTab>> {
    const tabs = this._tabMap.values();
    const map = new SetMap<string, CompatTab>((item) => item.id);
    for (const tab of tabs) {
      if (tab.isPrivate != isPrivate) continue;
      const firstpartyDomain = this._registrableDomainMap.get(tab.url) ?? '';
      map.addItem(firstpartyDomain, tab);
    }
    return map;
  }

  public getDisplayedContainers(): readonly DisplayedContainer[] {
    return this._displayedContainers;
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
