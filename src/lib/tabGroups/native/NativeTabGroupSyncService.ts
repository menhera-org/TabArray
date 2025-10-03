/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2024 Menhera.org

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

import browser from 'webextension-polyfill';
import { CookieStore } from 'weeg-containers';

import { ServiceRegistry } from '../../ServiceRegistry';
import { StartupService } from '../../StartupService';
import { CookieStoreService } from '../CookieStoreService';
import { ConsoleService } from '../../console/ConsoleService';
import { NativeTabGroupService } from './NativeTabGroupService';
import { NativeTabGroupMappingStore } from './NativeTabGroupMappingStore';
import { NativeTabGroup } from './NativeTabGroupTypes';
import { NativeTabGroupCoordinator } from './NativeTabGroupCoordinator';
import { TabGroupDirectory } from '../TabGroupDirectory';

const consoleService = ConsoleService.getInstance();

type ContainerWindowData = {
  tabIds: number[];
  minIndex: number;
};

export class NativeTabGroupSyncService {
  private static readonly INSTANCE = new NativeTabGroupSyncService();

  public static getInstance(): NativeTabGroupSyncService {
    return NativeTabGroupSyncService.INSTANCE;
  }

  private readonly startupService = StartupService.getInstance();
  private readonly cookieStoreService = CookieStoreService.getInstance();
  private readonly nativeTabGroupService = NativeTabGroupService.getInstance();
  private readonly mappingStore = NativeTabGroupMappingStore.getInstance();
  private readonly coordinator = NativeTabGroupCoordinator.getInstance();
  private readonly tabGroupDirectory = TabGroupDirectory.getInstance();

  private readonly managedRemovalGroupIds = new Set<number>();

  private syncRunning = false;
  private pendingSync = false;

  private constructor() {
    this.startupService.onStartup.addListener(() => {
      this.enqueueSync();
    });

    this.nativeTabGroupService.onGroupRemoved.addListener(this.handleNativeGroupRemoved);

    browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
      if (Object.prototype.hasOwnProperty.call(changeInfo, 'pinned')) {
        this.enqueueSync();
      }
    });

    if (browser.contextualIdentities?.onCreated) {
      browser.contextualIdentities.onCreated.addListener(() => {
        this.enqueueSync();
      });
    }

    if (browser.contextualIdentities?.onUpdated) {
      browser.contextualIdentities.onUpdated.addListener(() => {
        this.enqueueSync();
      });
    }

    if (browser.contextualIdentities?.onRemoved) {
      browser.contextualIdentities.onRemoved.addListener(() => {
        this.enqueueSync();
      });
    }
  }

  public async synchronize(): Promise<void> {
    if (!await this.nativeTabGroupService.isEnabled()) {
      return;
    }

    const [cookieStores, mappingTable, nativeGroups, tabs, snapshot] = await Promise.all([
      this.cookieStoreService.getCookieStores(),
      this.mappingStore.getAll(),
      this.nativeTabGroupService.query(),
      browser.tabs.query({}),
      this.tabGroupDirectory.getSnapshot(),
    ]);

    const managedContainers = new Set(cookieStores.filter((cookieStore) => this.shouldManageCookieStore(cookieStore)).map((cookieStore) => cookieStore.id));
    const nativeGroupMap = new Map<number, NativeTabGroup>(nativeGroups.map((group) => [group.id, group]));

    const containerWindowData = new Map<string, Map<number, ContainerWindowData>>();
    const windowContainerData = new Map<number, Map<string, ContainerWindowData>>();

    for (const tab of tabs) {
      if (!tab.cookieStoreId || tab.windowId === undefined || tab.id === undefined) {
        continue;
      }
      if (tab.pinned) {
        continue;
      }
      if (!managedContainers.has(tab.cookieStoreId)) {
        continue;
      }

      let containerMap = containerWindowData.get(tab.cookieStoreId);
      if (!containerMap) {
        containerMap = new Map<number, ContainerWindowData>();
        containerWindowData.set(tab.cookieStoreId, containerMap);
      }
      let containerEntry = containerMap.get(tab.windowId);
      if (!containerEntry) {
        containerEntry = { tabIds: [], minIndex: Number.POSITIVE_INFINITY };
        containerMap.set(tab.windowId, containerEntry);
      }
      containerEntry.tabIds.push(tab.id);
      if (typeof tab.index === 'number' && tab.index < containerEntry.minIndex) {
        containerEntry.minIndex = tab.index;
      }

      let windowMap = windowContainerData.get(tab.windowId);
      if (!windowMap) {
        windowMap = new Map<string, ContainerWindowData>();
        windowContainerData.set(tab.windowId, windowMap);
      }
      const existingEntry = windowMap.get(tab.cookieStoreId);
      if (!existingEntry) {
        windowMap.set(tab.cookieStoreId, containerEntry);
      } else {
        if (containerEntry.minIndex < existingEntry.minIndex) {
          existingEntry.minIndex = containerEntry.minIndex;
        }
        existingEntry.tabIds = containerEntry.tabIds;
      }
    }

    for (const containerId of managedContainers) {
      const containerWindows = containerWindowData.get(containerId);
      if (!containerWindows) {
        continue;
      }
      for (const [windowId, data] of containerWindows) {
        if (data.tabIds.length === 0) {
          continue;
        }
        const group = await this.coordinator.ensureTabsGrouped(windowId, containerId, data.tabIds);
        if (group) {
          nativeGroupMap.set(group.id, group);
        }
      }
      await this.coordinator.syncNativeGroupsFromContainer(containerId);
    }

    for (const [containerId, entries] of Object.entries(mappingTable)) {
      const containerWindows = containerWindowData.get(containerId);
      for (const entry of entries.slice()) {
        const group = nativeGroupMap.get(entry.nativeGroupId);
        const shouldManage = managedContainers.has(containerId);
        const hasTabs = containerWindows ? (containerWindows.get(entry.windowId)?.tabIds.length ?? 0) > 0 : false;

        if (!shouldManage || !hasTabs) {
          await this.deleteMappingAndGroup(containerId, entry.windowId, entry.nativeGroupId, Boolean(group));
          continue;
        }

        if (!group) {
          await this.mappingStore.delete(containerId, entry.windowId);
        }
      }
    }

    const containerOrder = snapshot.getContainerOrder();
    for (const [windowId, containerMap] of windowContainerData) {
      const orderedContainers: string[] = [];
      for (const containerId of containerOrder) {
        if (containerMap.has(containerId)) {
          orderedContainers.push(containerId);
        }
      }
      for (const containerId of containerMap.keys()) {
        if (!orderedContainers.includes(containerId)) {
          orderedContainers.push(containerId);
        }
      }
      if (orderedContainers.length === 0) {
        continue;
      }
      await this.coordinator.reorderNativeGroups(windowId, orderedContainers);
    }
  }

  private shouldManageCookieStore(cookieStore: CookieStore): boolean {
    if (cookieStore.isPrivate) {
      return false;
    }
    return cookieStore.userContextId !== 0;
  }

  private async deleteMappingAndGroup(containerId: string, windowId: number, groupId: number, shouldRemoveGroup: boolean): Promise<void> {
    if (shouldRemoveGroup) {
      this.managedRemovalGroupIds.add(groupId);
      try {
        await this.nativeTabGroupService.remove(groupId);
        consoleService.output('NativeTabGroupSyncService', 'info', `Removed native tab group ${groupId} for container ${containerId} in window ${windowId}`);
      } catch (error) {
        consoleService.output('NativeTabGroupSyncService', 'warn', `Failed to remove native tab group ${groupId} for container ${containerId} in window ${windowId}`, error);
      } finally {
        this.managedRemovalGroupIds.delete(groupId);
      }
    }
    await this.mappingStore.delete(containerId, windowId);
  }

  private enqueueSync(): void {
    if (this.syncRunning) {
      this.pendingSync = true;
      return;
    }
    this.syncRunning = true;
    this.synchronize().catch((error) => {
      consoleService.output('NativeTabGroupSyncService', 'error', 'Failed to synchronize native tab groups', error);
    }).finally(() => {
      this.syncRunning = false;
      if (this.pendingSync) {
        this.pendingSync = false;
        this.enqueueSync();
      }
    });
  }

  private readonly handleNativeGroupRemoved = (group: NativeTabGroup): void => {
    if (this.managedRemovalGroupIds.has(group.id)) {
      // Ignored; we initiated this removal.
      return;
    }
    this.handleExternalNativeGroupRemoval(group).catch((error) => {
      consoleService.output('NativeTabGroupSyncService', 'warn', `Failed to handle native tab group removal for ${group.id}`, error);
    });
  };

  private async handleExternalNativeGroupRemoval(group: NativeTabGroup): Promise<void> {
    const match = await this.mappingStore.findContainerIdByGroupId(group.id);
    if (!match) {
      return;
    }
    await this.mappingStore.delete(match.containerId, match.entry.windowId);
    this.enqueueSync();
  }
}

ServiceRegistry.getInstance().registerService('NativeTabGroupSyncService', NativeTabGroupSyncService.getInstance());
