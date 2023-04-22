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

import { CompatTab } from "weeg-tabs";
import { Uint32 } from "weeg-types";

export class WindowStateSnapshot {
  public readonly id: number;
  public readonly isPrivate: boolean;
  public readonly tabs: readonly CompatTab[];
  public readonly activeTabs: readonly CompatTab[];
  public readonly pinnedTabs: readonly CompatTab[];
  public readonly activeUserContexts: readonly Uint32.Uint32[];
  public readonly userContextUnpinnedTabMap: ReadonlyMap<Uint32.Uint32, readonly CompatTab[]>;

  public constructor(windowId: number, isPrivate: boolean, tabs: CompatTab[]) {
    this.id = windowId;
    this.isPrivate = isPrivate;
    this.tabs = tabs;

    const activeTabs = [];
    const pinnedTabs = [];
    const userContextUnpinnedTabMap = new Map<Uint32.Uint32, CompatTab[]>();
    const activeUserContexts = new Set<Uint32.Uint32>();
    for (const tab of this.tabs) {
      if (tab.active) {
        activeTabs.push(tab);
      }
      if (tab.pinned) {
        pinnedTabs.push(tab);
      } else {
        activeUserContexts.add(tab.cookieStore.userContextId);
        if (userContextUnpinnedTabMap.has(tab.cookieStore.userContextId)) {
          const userContextUnpinnedTabs = userContextUnpinnedTabMap.get(tab.cookieStore.userContextId);
          if (userContextUnpinnedTabs == null) {
            throw new Error('userContextUnpinnedTabs is null'); // This should never happen
          }
          userContextUnpinnedTabs.push(tab);
        } else {
          userContextUnpinnedTabMap.set(tab.cookieStore.userContextId, [tab]);
        }
      }
    }
    this.activeTabs = activeTabs;
    this.pinnedTabs = pinnedTabs;
    this.activeUserContexts = Array.from(activeUserContexts);
    this.userContextUnpinnedTabMap = userContextUnpinnedTabMap;
  }
}
