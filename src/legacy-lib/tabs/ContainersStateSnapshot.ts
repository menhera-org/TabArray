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

import { DisplayedContainer } from "weeg-containers";

import { Tab } from "./Tab";
import { TabGroupDirectorySnapshot } from "../../lib/tabGroups/TabGroupDirectorySnapshot";

export class ContainersStateSnapshot {
  public readonly displayedContainers: readonly DisplayedContainer[];
  private readonly _tabsByContainer = new Map<string, Tab[]>();
  public readonly tabGroupDirectorySnapshot: TabGroupDirectorySnapshot;

  public constructor(displayedContainers: DisplayedContainer[], tabs: Tab[], tabGroupDirectorySnapshot: TabGroupDirectorySnapshot) {
    this.displayedContainers = displayedContainers;
    this.tabGroupDirectorySnapshot = tabGroupDirectorySnapshot;
    tabs.sort((a, b) => {
      if (a.windowId == b.windowId) {
        return a.index - b.index;
      }
      return a.windowId - b.windowId;
    });
    for (const tab of tabs) {
      const cookieStoreId = tab.cookieStoreId;
      let tabs = this._tabsByContainer.get(cookieStoreId);
      if (!tabs) {
        tabs = [];
        this._tabsByContainer.set(cookieStoreId, tabs);
      }
      tabs.push(tab);
    }
  }

  public getTabsByContainer(cookieStoreId: string): readonly Tab[] {
    const tabs = this._tabsByContainer.get(cookieStoreId);
    if (tabs) {
      return tabs;
    }
    return [];
  }
}
