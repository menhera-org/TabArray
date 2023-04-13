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

import { CompatTab, CompatTabGroup, WindowTabGroupFilter, PinnedTabGroupFilter, DomainTabGroupFilter, TabGroupFilter, StandardTabSorter } from "weeg-tabs";

import { SupergroupTabGroupFilter } from "./SupergroupTabGroupFilter";
import { ServiceRegistry } from "../ServiceRegistry";

export type TabQuery = {
  windowId?: number;
  tabGroupId?: string;
  pinned?: boolean;
  registrableDomain?: string;
};

export class TabQueryService {
  private static readonly INSTANCE = new TabQueryService();

  public static getInstance(): TabQueryService {
    return TabQueryService.INSTANCE;
  }

  private readonly tabSorter = new StandardTabSorter();

  private constructor() {
    // Do nothing
  }

  public async queryTabs(query: TabQuery): Promise<CompatTab[]> {
    const filters: TabGroupFilter[] = [];
    if (null != query.tabGroupId) {
      filters.push(new SupergroupTabGroupFilter(query.tabGroupId));
    }
    if (null != query.windowId) {
      filters.push(new WindowTabGroupFilter(query.windowId));
    }
    if (null != query.pinned) {
      filters.push(new PinnedTabGroupFilter(query.pinned));
    }
    if (null != query.registrableDomain) {
      filters.push(new DomainTabGroupFilter(query.registrableDomain));
    }
    const compatTabGroup = new CompatTabGroup(... filters);
    const tabs = await compatTabGroup.getTabs();
    return this.tabSorter.sortTabs(tabs);
  }
}

ServiceRegistry.getInstance().registerService('TabQueryService', TabQueryService.getInstance());
