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
import { DisplayedContainerService } from '../DisplayedContainerService';
import { ConsoleService } from '../../console/ConsoleService';
import { NativeTabGroupService } from './NativeTabGroupService';
import { NativeTabGroupMappingStore } from './NativeTabGroupMappingStore';
import { NativeTabGroup } from './NativeTabGroupTypes';
import { ContextualIdentityService } from '../ContextualIdentityService';

const consoleService = ConsoleService.getInstance();

export class NativeTabGroupSyncService {
  private static readonly INSTANCE = new NativeTabGroupSyncService();

  public static getInstance(): NativeTabGroupSyncService {
    return NativeTabGroupSyncService.INSTANCE;
  }

  private readonly startupService = StartupService.getInstance();
  private readonly cookieStoreService = CookieStoreService.getInstance();
  private readonly nativeTabGroupService = NativeTabGroupService.getInstance();
  private readonly mappingStore = NativeTabGroupMappingStore.getInstance();
  private readonly displayedContainerService = DisplayedContainerService.getInstance();
  private readonly contextualIdentityFactory = ContextualIdentityService.getInstance().getFactory();

  private readonly managedRemovalGroupIds = new Set<number>();

  private syncRunning = false;
  private pendingSync = false;

  private constructor() {
    this.startupService.onStartup.addListener(() => {
      this.enqueueSync();
    });

    this.nativeTabGroupService.onGroupUpdated.addListener(this.handleNativeGroupUpdated);
    this.nativeTabGroupService.onGroupRemoved.addListener(this.handleNativeGroupRemoved);
    this.nativeTabGroupService.onGroupMoved.addListener(() => {
      this.enqueueSync();
    });

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
    const enabled = await this.nativeTabGroupService.isEnabled();
    if (!enabled) {
      return;
    }

    const [cookieStores, displayedContainers, mappingTable, nativeGroups, tabs] = await Promise.all([
      this.cookieStoreService.getCookieStores(),
      this.displayedContainerService.getDisplayedContainers(),
      this.mappingStore.getAll(),
      this.nativeTabGroupService.query(),
      browser.tabs.query({}),
    ]);

    const managedContainers = new Set(cookieStores.filter((cookieStore) => this.shouldManageCookieStore(cookieStore)).map((cookieStore) => cookieStore.id));
    const nativeGroupMap = new Map<number, NativeTabGroup>(nativeGroups.map((group) => [group.id, group]));

    const containerNames = new Map<string, string>();
    for (const container of displayedContainers) {
      const { cookieStore, name } = container;
      if (!this.shouldManageCookieStore(cookieStore)) {
        continue;
      }
      containerNames.set(cookieStore.id, name);
    }

    const containerWindowTabs = new Map<string, Map<number, number[]>>();
    for (const tab of tabs) {
      if (!tab.cookieStoreId || tab.windowId === undefined) {
        continue;
      }
      if (tab.windowType && tab.windowType !== 'normal') {
        continue;
      }
      if (tab.pinned) {
        continue;
      }
      if (tab.id === undefined) {
        continue;
      }
      if (!managedContainers.has(tab.cookieStoreId)) {
        continue;
      }
      let windowMap = containerWindowTabs.get(tab.cookieStoreId);
      if (!windowMap) {
        windowMap = new Map<number, number[]>();
        containerWindowTabs.set(tab.cookieStoreId, windowMap);
      }
      let tabIds = windowMap.get(tab.windowId);
      if (!tabIds) {
        tabIds = [];
        windowMap.set(tab.windowId, tabIds);
      }
      tabIds.push(tab.id);
    }

    for (const [containerId, entries] of Object.entries(mappingTable)) {
      const seenWindows = new Set<number>();
      const windowsWithTabsMap = containerWindowTabs.get(containerId);
      for (const entry of entries.slice()) {
        const group = nativeGroupMap.get(entry.nativeGroupId);
        if (group && group.windowId !== entry.windowId) {
          const updatedEntry = {
            windowId: group.windowId,
            nativeGroupId: group.id,
            lastKnownTitle: entry.lastKnownTitle,
          };
          await this.mappingStore.upsert(containerId, updatedEntry);
          entry.windowId = group.windowId;
        }

        if (seenWindows.has(entry.windowId)) {
          await this.deleteMappingAndGroup(containerId, entry.windowId, entry.nativeGroupId, Boolean(group));
          continue;
        }
        seenWindows.add(entry.windowId);

        const shouldManage = managedContainers.has(containerId);
        const tabsForWindow = windowsWithTabsMap?.get(entry.windowId) ?? [];
        const hasTabsInWindow = tabsForWindow.length > 0;

        if (!shouldManage || !hasTabsInWindow) {
          await this.deleteMappingAndGroup(containerId, entry.windowId, entry.nativeGroupId, Boolean(group));
          continue;
        }

        if (!group) {
          await this.mappingStore.delete(containerId, entry.windowId);
        }
      }
    }

    for (const containerId of managedContainers) {
      const containerName = containerNames.get(containerId) ?? containerId;
      const windowsWithTabsMap = containerWindowTabs.get(containerId);
      if (!windowsWithTabsMap || windowsWithTabsMap.size === 0) {
        continue;
      }
      for (const [windowId, tabIds] of windowsWithTabsMap.entries()) {
        if (tabIds.length === 0) {
          continue;
        }
        await this.ensureContainerHasNativeGroup(containerId, windowId, containerName, nativeGroupMap, tabIds);
      }
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

  private async ensureContainerHasNativeGroup(containerId: string, windowId: number, containerName: string, nativeGroupMap: Map<number, NativeTabGroup>, tabIds: number[]): Promise<void> {
    const mappings = await this.mappingStore.get(containerId);
    const mappingEntry = mappings.find((entry) => entry.windowId === windowId);
    let nativeGroup = mappingEntry ? nativeGroupMap.get(mappingEntry.nativeGroupId) : undefined;

    if (nativeGroup && nativeGroup.windowId !== windowId) {
      await this.mappingStore.delete(containerId, windowId);
      nativeGroup = undefined;
    }

    if (!mappingEntry || !nativeGroup) {
      nativeGroup = await this.createNativeGroup(containerId, containerName, windowId, tabIds);
      if (!nativeGroup) {
        return;
      }
      nativeGroupMap.set(nativeGroup.id, nativeGroup);
      await this.mappingStore.upsert(containerId, { windowId, nativeGroupId: nativeGroup.id, lastKnownTitle: containerName });
      return;
    }

    try {
      await browser.tabs.group({ groupId: nativeGroup.id, tabIds });
    } catch (error) {
      consoleService.output('NativeTabGroupSyncService', 'warn', `Failed to attach tabs to native tab group ${nativeGroup.id} for container ${containerId} in window ${windowId}`, error);
    }

    const expectedTitle = containerName;
    const currentTitle = nativeGroup.title ?? '';
    if (currentTitle !== expectedTitle) {
      try {
        nativeGroup = await this.nativeTabGroupService.update(nativeGroup.id, { title: expectedTitle });
        nativeGroupMap.set(nativeGroup.id, nativeGroup);
      } catch (error) {
        consoleService.output('NativeTabGroupSyncService', 'warn', `Failed to update native tab group ${nativeGroup.id} title for container ${containerId} in window ${windowId}`, error);
        return;
      }
    }

    if (mappingEntry.lastKnownTitle !== expectedTitle) {
      await this.mappingStore.upsert(containerId, { windowId, nativeGroupId: nativeGroup.id, lastKnownTitle: expectedTitle });
    }
  }

  private async createNativeGroup(containerId: string, containerName: string, windowId: number, tabIds: number[]): Promise<NativeTabGroup | undefined> {
    if (tabIds.length === 0) {
      consoleService.output('NativeTabGroupSyncService', 'warn', `Cannot create native tab group for ${containerId} in window ${windowId}: no tabs available.`);
      return undefined;
    }
    try {
      return await this.nativeTabGroupService.create({ windowId, title: containerName, tabIds });
    } catch (error) {
      consoleService.output('NativeTabGroupSyncService', 'warn', `Failed to create native tab group for container ${containerId} in window ${windowId}`, error);
      return undefined;
    }
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

  private readonly handleNativeGroupUpdated = (group: NativeTabGroup): void => {
    this.handleNativeGroupTitleChange(group).catch((error) => {
      consoleService.output('NativeTabGroupSyncService', 'warn', `Failed to process native group ${group.id} update`, error);
    });
  };

  private readonly handleNativeGroupRemoved = (group: NativeTabGroup): void => {
    if (this.managedRemovalGroupIds.has(group.id)) {
      // Ignored; we initiated this removal.
      return;
    }
    this.handleExternalNativeGroupRemoval(group).catch((error) => {
      consoleService.output('NativeTabGroupSyncService', 'warn', `Failed to handle native tab group removal for ${group.id}`, error);
    });
  };

  private async handleNativeGroupTitleChange(group: NativeTabGroup): Promise<void> {
    const match = await this.mappingStore.findContainerIdByGroupId(group.id);
    if (!match) {
      return;
    }
    const { containerId, entry } = match;
    const title = (group.title ?? '').trim();
    if (title.length > 0) {
      try {
        const identity = await this.contextualIdentityFactory.get(containerId);
        if (identity.name !== title) {
          await this.contextualIdentityFactory.setParams(containerId, { name: title });
        }
      } catch (error) {
        consoleService.output('NativeTabGroupSyncService', 'warn', `Failed to update container ${containerId} name from native tab group ${group.id}`, error);
      }
    }
    await this.mappingStore.upsert(containerId, { windowId: entry.windowId, nativeGroupId: group.id, lastKnownTitle: title });
  }

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
