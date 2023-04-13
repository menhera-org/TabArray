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
import { CompatTab, TabGroupFilter } from "weeg-tabs";

import { TabGroupAttributes } from '../tabGroups/TabGroupAttributes';
import { TabGroupDirectory } from "../tabGroups/TabGroupDirectory";

const tabGroupDirectory = new TabGroupDirectory();

export class SupergroupTabGroupFilter implements TabGroupFilter {
  public readonly tabGroupId: string;

  public constructor(tabGroupId: string) {
    this.tabGroupId = tabGroupId;
  }

  private async getChildCookieStoreIds(): Promise<string[]> {
    const attributes = new TabGroupAttributes(this.tabGroupId);
    if (attributes.tabGroupType == 'cookieStore') {
      return [this.tabGroupId];
    }
    return tabGroupDirectory.getChildContainers(this.tabGroupId);
  }

  public async getTabs(): Promise<CompatTab[]> {
    const cookieStoreIds = await this.getChildCookieStoreIds();
    const tabs = (await browser.tabs.query({ cookieStoreId: cookieStoreIds })).map((tab) => new CompatTab(tab));
    return tabs;
  }

  public async filterTabs(tabs: CompatTab[]): Promise<CompatTab[]> {
    const cookieStoreIds = await this.getChildCookieStoreIds();
    return tabs.filter((tab) => cookieStoreIds.includes(tab.cookieStore.id));
  }
}
