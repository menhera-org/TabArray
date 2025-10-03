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

import { CookieStore } from 'weeg-containers';

import { ServiceRegistry } from '../../ServiceRegistry';
import { StartupService } from '../../StartupService';
import { CookieStoreService } from '../CookieStoreService';
import { ConsoleService } from '../../console/ConsoleService';
import { NativeTabGroupService } from './NativeTabGroupService';
import { NativeTabGroupMappingStore } from './NativeTabGroupMappingStore';

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

  private constructor() {
    this.startupService.onStartup.addListener(() => {
      this.synchronize().catch((error) => {
        consoleService.output('NativeTabGroupSyncService', 'error', 'Failed to synchronize native tab groups', error);
      });
    });
  }

  public async synchronize(): Promise<void> {
    const enabled = await this.nativeTabGroupService.isEnabled();
    if (!enabled) {
      return;
    }

    const [cookieStores, mappings, nativeGroups] = await Promise.all([
      this.cookieStoreService.getCookieStores(),
      this.mappingStore.getAll(),
      this.nativeTabGroupService.query(),
    ]);

    const managedContainers = new Set(cookieStores.filter((cookieStore) => this.shouldManageCookieStore(cookieStore)).map((cookieStore) => cookieStore.id));
    const nativeGroupIds = new Set(nativeGroups.map((group) => group.id));

    for (const [containerId, entry] of Object.entries(mappings)) {
      if (managedContainers.has(containerId)) {
        continue;
      }
      await this.deleteMappingAndGroup(containerId, entry.nativeGroupId, nativeGroupIds.has(entry.nativeGroupId));
    }
  }

  private shouldManageCookieStore(cookieStore: CookieStore): boolean {
    if (cookieStore.isPrivate) {
      return false;
    }
    return cookieStore.userContextId !== 0;
  }

  private async deleteMappingAndGroup(containerId: string, groupId: number, shouldRemoveGroup: boolean): Promise<void> {
    if (shouldRemoveGroup) {
      try {
        await this.nativeTabGroupService.remove(groupId);
        consoleService.output('NativeTabGroupSyncService', 'info', `Removed native tab group ${groupId} for container ${containerId}`);
      } catch (error) {
        consoleService.output('NativeTabGroupSyncService', 'warn', `Failed to remove native tab group ${groupId} for container ${containerId}`, error);
      }
    }
    await this.mappingStore.delete(containerId);
  }
}

ServiceRegistry.getInstance().registerService('NativeTabGroupSyncService', NativeTabGroupSyncService.getInstance());
