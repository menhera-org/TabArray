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

import { StorageItem } from "weeg-storage";
import { CookieStore } from "weeg-containers";
import { EventSink } from "weeg-events";
import { Uint32 } from "weeg-types";

import { UserContextSortingOrderStore } from "../userContexts/UserContextSortingOrderStore";
import { TabGroupAttributes } from "./TabGroupAttributes";
import { TabGroupDirectorySnapshot } from "./TabGroupDirectorySnapshot";

// this is not applicable to private windows.

export type SupergroupType = {
  supergroupId: number;
  name: string;
  members: string[];
};

export type StorageType = {
  [tabGroupId: string]: SupergroupType;
};

/**
 * In background pages, this must be instantiated on the first event loop of execution.
 */
export class TabGroupDirectory {
  public readonly onChanged = new EventSink<void>();

  private readonly storage = new StorageItem<StorageType>('tabGroupDirectory', {}, StorageItem.AREA_LOCAL);
  private readonly userContextSortingOrderStore = UserContextSortingOrderStore.getInstance();

  public constructor() {
    this.storage.onChanged.addListener(() => this.onChanged.dispatch());
    this.userContextSortingOrderStore.onChanged.addListener(() => this.onChanged.dispatch());
  }

  public static getRootSupergroupId(): string {
    return TabGroupAttributes.getTabGroupIdFromSupergroupId(0);
  }

  public async getValue(): Promise<StorageType> {
    const value = await this.storage.getValue();
    const userContextIds = await this.userContextSortingOrderStore.getOrder();
    const cookieStoreIds = userContextIds.map((userContextId) => CookieStore.fromParams({ userContextId, privateBrowsingId: 0 as Uint32.Uint32 }).id);
    const rootSupergroupId = TabGroupDirectory.getRootSupergroupId();
    if (!(rootSupergroupId in value)) {
      value[rootSupergroupId] = {
        supergroupId: 0,
        name: '',
        members: [],
      };
    }

    const rootSupergroup = value[rootSupergroupId] as SupergroupType;

    for (const cookieStoreId of cookieStoreIds) {
      let found = false;
      for (const supergroupId in value) {
        const supergroup = value[supergroupId] as SupergroupType;
        if (supergroup.members.includes(cookieStoreId)) {
          found = true;
          break;
        }
      }
      if (!found) {
        rootSupergroup.members.push(cookieStoreId);
      }
    }

    for (const definedSupergroupId in value) {
      const definedSupergroup = value[definedSupergroupId] as SupergroupType;
      definedSupergroup.members = definedSupergroup.members.filter((memberTabGroupId) => {
        const attributes = new TabGroupAttributes(memberTabGroupId);
        if (attributes.tabGroupType == 'supergroup') {
          return true;
        }
        return cookieStoreIds.includes(memberTabGroupId);
      });

      let found = false;
      for (const supergroupId in value) {
        const supergroup = value[supergroupId] as SupergroupType;
        if (supergroup.members.includes(definedSupergroupId)) {
          found = true;
          break;
        }
      }
      if (!found && definedSupergroupId != rootSupergroupId) {
        rootSupergroup.members.push(definedSupergroupId);
      }
    }

    return value;
  }

  public async setValue(value: StorageType): Promise<void> {
    await this.storage.setValue(value);
  }

  public async getSupergroup(tabGroupId: string): Promise<SupergroupType | undefined> {
    const value = await this.getValue();
    return value[tabGroupId];
  }

  public async getChildContainers(tabGroupId: string): Promise<string[]> {
    return (await this.getSnapshot()).getChildContainers(tabGroupId);
  }

  public async getParentTabGroupId(tabGroupId: string): Promise<string | undefined> {
    const value = await this.getValue();
    for (const supergroupId in value) {
      const supergroup = value[supergroupId] as SupergroupType;
      if (supergroup.members.includes(tabGroupId)) {
        return supergroupId;
      }
    }
    return undefined;
  }

  public async createSupergroup(name: string): Promise<string> {
    const value = await this.getValue();
    const tabGroupIds = Object.keys(value);
    const supergroupIds = tabGroupIds.map((tabGroupId) => new TabGroupAttributes(tabGroupId).supergroupId as number);
    const maxSupergroupId = Math.max(...supergroupIds);
    const supergroupId = maxSupergroupId + 1;
    const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroupId);
    value[tabGroupId] = {
      supergroupId,
      name,
      members: [],
    };
    const rootSupergroupId = TabGroupDirectory.getRootSupergroupId();
    const rootSupergroup = value[rootSupergroupId] as SupergroupType;
    rootSupergroup.members.push(tabGroupId);
    await this.setValue(value);
    return tabGroupId;
  }

  public async renameSupergroup(tabGroupId: string, name: string): Promise<void> {
    const value = await this.getValue();
    const supergroup = value[tabGroupId] as SupergroupType;
    if (!supergroup) return;
    supergroup.name = name;
    await this.setValue(value);
  }

  public async removeSupergroup(tabGroupId: string): Promise<void> {
    if (tabGroupId == TabGroupDirectory.getRootSupergroupId()) return;
    const value = await this.getValue();
    const supergroup = value[tabGroupId] as SupergroupType;
    if (!supergroup) return;
    const parentTabGroupId = await this.getParentTabGroupId(tabGroupId) ?? TabGroupDirectory.getRootSupergroupId();
    const parentSupergroup = value[parentTabGroupId] as SupergroupType;
    for (const memberTabGroupId of supergroup.members) {
      parentSupergroup.members.push(memberTabGroupId);
    }
    for (const definedTabGroupId in value) {
      const definedSupergroup = value[definedTabGroupId] as SupergroupType;
      definedSupergroup.members = definedSupergroup.members.filter((memberTabGroupId) => memberTabGroupId !== tabGroupId);
    }
    delete value[tabGroupId];
    await this.setValue(value);
  }

  public async moveTabGroupToSupergroup(tabGroupId: string, parentTabGroupId: string): Promise<void> {
    const snapshot = await this.getSnapshot();
    const value = snapshot.value;
    if (snapshot.hasChildTabGroupId(tabGroupId, parentTabGroupId)) return;
    const parentSupergroup = value[parentTabGroupId] as SupergroupType;
    if (!parentSupergroup) return;
    const currentParentTabGroupId = snapshot.getParentTabGroupId(tabGroupId) ?? TabGroupDirectory.getRootSupergroupId();
    if (currentParentTabGroupId == parentTabGroupId) return;
    const currentParentSupergroup = value[currentParentTabGroupId] as SupergroupType;
    currentParentSupergroup.members = currentParentSupergroup.members.filter((memberTabGroupId) => memberTabGroupId !== tabGroupId);
    parentSupergroup.members.push(tabGroupId);
    await this.setValue(value);
  }

  public async moveTabGroupUp(tabGroupId: string): Promise<void> {
    const snapshot = await this.getSnapshot();
    const parentTabGroupId = snapshot.getParentTabGroupId(tabGroupId);
    if (!parentTabGroupId) return;
    const value = snapshot.value;
    const supergroup = value[parentTabGroupId] as SupergroupType;
    const index = supergroup.members.indexOf(tabGroupId);
    if (index <= 0) return;
    supergroup.members.splice(index, 1);
    supergroup.members.splice(index - 1, 0, tabGroupId);
    await this.setValue(value);
  }

  public async moveTabGroupDown(tabGroupId: string): Promise<void> {
    const snapshot = await this.getSnapshot();
    const parentTabGroupId = snapshot.getParentTabGroupId(tabGroupId);
    if (!parentTabGroupId) return;
    const value = snapshot.value;
    const supergroup = value[parentTabGroupId] as SupergroupType;
    const index = supergroup.members.indexOf(tabGroupId);
    if (index < 0 || index >= supergroup.members.length - 1) return;
    supergroup.members.splice(index, 1);
    supergroup.members.splice(index + 1, 0, tabGroupId);
    await this.setValue(value);
  }

  public async getSnapshot(): Promise<TabGroupDirectorySnapshot> {
    const value = await this.getValue();
    return new TabGroupDirectorySnapshot(value);
  }
}
