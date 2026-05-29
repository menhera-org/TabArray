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

import { StorageItem } from "weeg-storage";
import { CookieStore } from "weeg-containers";
import { EventSink } from "weeg-events";
import { Uint32 } from "weeg-types";

import { TabGroupAttributes, TabGroupType } from "./TabGroupAttributes";
import { TabGroupDirectorySnapshot } from "./TabGroupDirectorySnapshot";
import { ContextualIdentityService } from "./ContextualIdentityService";

// this is not applicable to private windows.

export type SupergroupType = {
  supergroupId: number;
  name: string;
  members: string[];
};

export type SupergroupStorageType = {
  [tabGroupId: string]: SupergroupType;
};

/**
 * In background pages, this must be instantiated on the first event loop of execution.
 */
export class TabGroupDirectory {
  private static readonly STORAGE_KEY = 'tabGroupDirectory';
  private static readonly LEGACY_STORAGE_KEY = 'userContextSortingOrder';
  private static readonly INSTANCE = new TabGroupDirectory();

  public static getInstance(): TabGroupDirectory {
    return TabGroupDirectory.INSTANCE;
  }

  public readonly onChanged = new EventSink<void>();

  private readonly storage = new StorageItem<SupergroupStorageType>(TabGroupDirectory.STORAGE_KEY, {}, StorageItem.AREA_LOCAL);
  private readonly legacyStorage = new StorageItem<Uint32.Uint32[]>(TabGroupDirectory.LEGACY_STORAGE_KEY, [], StorageItem.AREA_LOCAL);

  private storageCache: SupergroupStorageType | undefined;
  private legacyStorageCache: Uint32.Uint32[] | undefined;

  private readonly contextualIdentityService = ContextualIdentityService.getInstance();
  private readonly contextualIdentityFactory = this.contextualIdentityService.getFactory();

  private constructor() {
    this.storage.onChanged.addListener((value) => {
      this.storageCache = value;
      this.onChanged.dispatch();
    });

    this.legacyStorage.onChanged.addListener((value) => {
      this.legacyStorageCache = value;
      this.onChanged.dispatch();
    });
  }

  private async getLegacyUserContextOrder(): Promise<Uint32.Uint32[]> {
    if (this.legacyStorageCache !== undefined) {
      return this.legacyStorageCache;
    }
    const value = await this.legacyStorage.getValue();
    this.legacyStorageCache = value;
    return value;
  }

  /**
   * Returns non-private cookie stores by userContextId.
   */
  private async getDefinedUserContextIds(): Promise<Uint32.Uint32[]> {
    const contextualIdentities = await this.contextualIdentityFactory.getAll();
    const userContextIds = contextualIdentities.map((contextualIdentity) => contextualIdentity.cookieStore.userContextId);
    return [
      0 as Uint32.Uint32,
      ... userContextIds,
    ];
  }

  private async getLegacyUserContextOrderSorted(): Promise<Uint32.Uint32[]> {
    const order = await this.getLegacyUserContextOrder();
    const userContextIds = await this.getDefinedUserContextIds();
    userContextIds.sort((a: Uint32.Uint32, b: Uint32.Uint32): number => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex < 0 && bIndex < 0) {
        return a - b;
      }
      if (aIndex < 0) {
        return 1;
      }
      if (bIndex < 0) {
        return -1;
      }
      return aIndex - bIndex;
    });
    return userContextIds;
  }

  private async getRawValue(): Promise<SupergroupStorageType> {
    if (this.storageCache !== undefined) {
      return this.storageCache;
    }
    const value = await this.storage.getValue();
    this.storageCache = value;
    return value;
  }

  public async getValue(): Promise<SupergroupStorageType> {
    const value = await this.getRawValue();
    const userContextIds = await this.getLegacyUserContextOrderSorted();
    const cookieStoreIds = userContextIds.map((userContextId) => CookieStore.fromParams({ userContextId, privateBrowsingId: 0 as Uint32.Uint32 }).id);
    const rootSupergroupId = TabGroupAttributes.getRootSupergroupTabGroupId();
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

  public async setValue(value: SupergroupStorageType): Promise<void> {
    await this.storage.setValue(value);
  }

  public async getSupergroup(tabGroupId: string): Promise<SupergroupType | undefined> {
    const value = await this.getValue();
    return value[tabGroupId];
  }

  /**
   * Returns child cookie store IDs for given tab group ID.
   */
  public async getChildContainers(tabGroupId: string): Promise<string[]> {
    return (await this.getSnapshot()).getContainerOrder(tabGroupId);
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

  /**
   * Root supergroup is not returned.
   */
  public async getAllTabGroupIds(includePrivateCookieStore = false): Promise<string[]> {
    const snapshot = await this.getSnapshot();
    const tabGroupIds: string[] = [];
    if (includePrivateCookieStore) {
      tabGroupIds.push(CookieStore.PRIVATE.id);
    }
    tabGroupIds.push(... snapshot.getTabGroupOrder());
    return tabGroupIds;
  }

  public async createSupergroup(name: string): Promise<string> {
    const value = await this.getValue();
    const tabGroupIds = Object.keys(value);
    const supergroupIds = tabGroupIds.map((tabGroupId) => {
      const attributes = new TabGroupAttributes(tabGroupId);
      if (attributes.tabGroupType != TabGroupType.SUPERGROUP) {
        throw new Error('Tab group is not a supergroup');
      }
      return attributes.supergroupId;
    });
    const maxSupergroupId = Math.max(...supergroupIds);
    const supergroupId = maxSupergroupId + 1;
    const tabGroupId = TabGroupAttributes.getTabGroupIdFromSupergroupId(supergroupId);
    value[tabGroupId] = {
      supergroupId,
      name,
      members: [],
    };
    const rootSupergroupId = TabGroupAttributes.getRootSupergroupTabGroupId();
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
    if (tabGroupId == TabGroupAttributes.getRootSupergroupTabGroupId()) return;
    const value = await this.getValue();
    const supergroup = value[tabGroupId] as SupergroupType;
    if (!supergroup) return;
    if (supergroup.supergroupId == 0) return;
    const parentTabGroupId = await this.getParentTabGroupId(tabGroupId) ?? TabGroupAttributes.getRootSupergroupTabGroupId();
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
    const currentParentTabGroupId = snapshot.getParentTabGroupId(tabGroupId) ?? TabGroupAttributes.getRootSupergroupTabGroupId();
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
