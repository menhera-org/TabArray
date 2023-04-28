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

import { DisplayedContainer } from "weeg-containers";

import { StorageType, SupergroupType } from "./TabGroupDirectory";
import { TabGroupAttributes, TabGroupFilter } from "./TabGroupAttributes";

export class TabGroupDirectorySnapshot {
  private readonly _value: StorageType;

  public constructor(value: StorageType) {
    this._value = value;
  }

  public get value(): StorageType {
    return structuredClone(this._value);
  }

  public getSupergroupTabGroupIds(): string[] {
    const value = this.value;
    const tabGroupIds: string[] = [];
    for (const tabGroupId in value) {
      tabGroupIds.push(tabGroupId);
    }
    return tabGroupIds;
  }

  public getSupergroup(tabGroupId: string): SupergroupType | undefined {
    const value = this.value;
    return value[tabGroupId];
  }

  public getParentTabGroupId(tabGroupId: string): string | undefined {
    const value = this.value;
    for (const supergroupId in value) {
      const supergroup = value[supergroupId] as SupergroupType;
      if (supergroup.members.includes(tabGroupId)) {
        return supergroupId;
      }
    }
    return undefined;
  }

  public hasChildTabGroupId(tabGroupId: string, childTabGroupId: string): boolean {
    const value = this.value;
    const supergroup = value[tabGroupId] as SupergroupType;
    if (!supergroup) return false;
    if (supergroup.members.includes(childTabGroupId)) return true;
    for (const memberTabGroupId of supergroup.members) {
      const attributes = new TabGroupAttributes(memberTabGroupId);
      if (attributes.tabGroupType == 'cookieStore') continue;
      if (this.hasChildTabGroupId(memberTabGroupId, childTabGroupId)) return true;
    }
    return false;
  }

  private forEachInternal(callback: (tabGroupId: string) => unknown | Promise<unknown>, thisArg: object | null | undefined, tabGroupFilter: TabGroupFilter, rootTabGroupId = TabGroupAttributes.getRootSupergroupTabGroupId(), aCache?: Set<string>): void {
    const cache = aCache ?? new Set();
    if (cache.has(rootTabGroupId)) return;
    cache.add(rootTabGroupId);

    const value = this.value;
    const supergroup = value[rootTabGroupId] as SupergroupType;
    if (!supergroup) return;

    const boundCallback = thisArg != null ? callback.bind(thisArg) : callback;

    for (const memberTabGroupId of supergroup.members) {
      const attributes = new TabGroupAttributes(memberTabGroupId);
      if (attributes.tabGroupType == 'cookieStore') {
        if (tabGroupFilter.cookieStore) {
          Promise.resolve(boundCallback(memberTabGroupId)).catch((e) => {
            console.error(e);
          })
        }
      } else {
        if (tabGroupFilter.supergroup) {
          Promise.resolve(boundCallback(memberTabGroupId)).catch((e) => {
            console.error(e);
          })
        }
        this.forEachInternal(callback, thisArg, tabGroupFilter, memberTabGroupId, cache);
      }
    }
  }

  public forEachTabGroup(callback: (tabGroupId: string) => unknown | Promise<unknown>, thisArg: object | null | undefined, rootTabGroupId = TabGroupAttributes.getRootSupergroupTabGroupId()): void {
    this.forEachInternal(callback, thisArg, {
      cookieStore: true,
      supergroup: true,
    }, rootTabGroupId);
  }

  public forEachCookieStore(callback: (tabGroupId: string) => unknown | Promise<unknown>, thisArg: object | null | undefined, rootTabGroupId = TabGroupAttributes.getRootSupergroupTabGroupId()): void {
    this.forEachInternal(callback, thisArg, {
      cookieStore: true,
      supergroup: false,
    }, rootTabGroupId);
  }

  public forEachSupergroup(callback: (tabGroupId: string) => unknown | Promise<unknown>, thisArg: object | null | undefined, rootTabGroupId = TabGroupAttributes.getRootSupergroupTabGroupId()): void {
    this.forEachInternal(callback, thisArg, {
      cookieStore: false,
      supergroup: true,
    }, rootTabGroupId);
  }

  private getTabGroupIdsInternal(tabGroupFilter: TabGroupFilter, rootTabGroupId = TabGroupAttributes.getRootSupergroupTabGroupId()): string[] {
    const tabGroupIds: string[] = [];
    this.forEachInternal((tabGroupId) => {
      tabGroupIds.push(tabGroupId);
    }, null, tabGroupFilter, rootTabGroupId);
    return tabGroupIds;
  }

  /**
   * Returns an ordered list of cookie store IDs. Private cookie store is not returned.
   */
  public getContainerOrder(tabGroupId = TabGroupAttributes.getRootSupergroupTabGroupId()): string[] {
    return this.getTabGroupIdsInternal({ cookieStore: true, supergroup: false }, tabGroupId);
  }

  /**
   * Returns an ordered list of tab group IDs for supergroups.
   * Root supergroup is not returned.
   */
  public getSupergroupOrder(tabGroupId = TabGroupAttributes.getRootSupergroupTabGroupId()): string[] {
    return this.getTabGroupIdsInternal({ cookieStore: false, supergroup: true }, tabGroupId);
  }

  /**
   * Returns an ordered list of tab group IDs for supergroups and cookie stores. Private cookie store is not returned.
   * Root supergroup is not returned.
   */
  public getTabGroupOrder(tabGroupId = TabGroupAttributes.getRootSupergroupTabGroupId()): string[] {
    return this.getTabGroupIdsInternal({ cookieStore: true, supergroup: true }, tabGroupId);
  }

  public cookieStoreIdSortingCallback(a: string, b: string): number {
    const tabGroupIds = this.getContainerOrder();
    const aIndex = tabGroupIds.indexOf(a);
    const bIndex = tabGroupIds.indexOf(b);
    if (aIndex != bIndex) {
      if (aIndex == -1) return 1;
      if (bIndex == -1) return -1;
    }
    return aIndex - bIndex;
  }

  public sortDisplayedContainers(displayedContainers: DisplayedContainer[]): void {
    displayedContainers.sort((a, b) => this.cookieStoreIdSortingCallback(a.cookieStore.id, b.cookieStore.id));
  }
}
