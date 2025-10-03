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
import { ContextualIdentity, CookieStore } from 'weeg-containers';

import { ServiceRegistry } from '../../ServiceRegistry';
import { NativeTabGroupService } from './NativeTabGroupService';
import { NativeTabGroupMappingStore, NativeTabGroupMappingEntry } from './NativeTabGroupMappingStore';
import { NativeTabGroup } from './NativeTabGroupTypes';
import { ContextualIdentityService } from '../ContextualIdentityService';
import { mapContainerColorToNative, mapNativeColorToContainer } from './NativeTabGroupColorMapper';
import { ConsoleService } from '../../console/ConsoleService';

const consoleService = ConsoleService.getInstance();

export class NativeTabGroupCoordinator {
  private static readonly INSTANCE = new NativeTabGroupCoordinator();

  public static getInstance(): NativeTabGroupCoordinator {
    return NativeTabGroupCoordinator.INSTANCE;
  }

  private readonly nativeService = NativeTabGroupService.getInstance();
  private readonly mappingStore = NativeTabGroupMappingStore.getInstance();
  private readonly contextualIdentityFactory = ContextualIdentityService.getInstance().getFactory();

  private readonly pendingContainerUpdates = new Set<string>();
  private readonly pendingNativeUpdates = new Set<number>();

  private constructor() {
    this.nativeService.onGroupUpdated.addListener((group) => {
      this.handleNativeGroupUpdated(group).catch((error) => {
        consoleService.output('NativeTabGroupCoordinator', 'warn', 'Failed to process native group update', error);
      });
    });

    if (browser.contextualIdentities?.onUpdated) {
      browser.contextualIdentities.onUpdated.addListener((changeInfo) => {
        const containerId = changeInfo.contextualIdentity.cookieStoreId;
        this.handleContainerUpdated(containerId).catch((error) => {
          consoleService.output('NativeTabGroupCoordinator', 'warn', 'Failed to process container update', error);
        });
      });
    }
  }

  public async isEnabled(): Promise<boolean> {
    return await this.nativeService.isEnabled();
  }

  public async ensureTabsGrouped(windowId: number, containerId: string, tabIds: number[]): Promise<NativeTabGroup | undefined> {
    if (!await this.isEnabled()) {
      return undefined;
    }
    const uniqueTabIds = [... new Set(tabIds)];
    const identity = await this.getContextualIdentity(containerId);
    if (!identity) {
      return undefined;
    }
    const existingGroup = await this.getGroupForWindow(windowId, containerId);
    if (existingGroup) {
      if (uniqueTabIds.length > 0) {
        try {
          await browser.tabs.group({ groupId: existingGroup.id, tabIds: uniqueTabIds });
        } catch (error) {
          consoleService.output('NativeTabGroupCoordinator', 'warn', `Failed to attach tabs to group ${existingGroup.id}`, error);
        }
      }
      await this.syncNativeGroupFromContainer(existingGroup.id, containerId, identity);
      return existingGroup;
    }

    if (uniqueTabIds.length === 0) {
      return undefined;
    }

    const nativeColor = mapContainerColorToNative(identity.color);
    const createdGroup = await this.nativeService.create({
      windowId,
      tabIds: uniqueTabIds,
      title: identity.name,
      color: nativeColor,
    });
    await this.mappingStore.upsert(containerId, {
      windowId,
      nativeGroupId: createdGroup.id,
      lastKnownTitle: identity.name,
    });
    return createdGroup;
  }

  public async assignTabs(windowId: number, containerId: string, tabIds: number[]): Promise<void> {
    await this.ensureTabsGrouped(windowId, containerId, tabIds);
  }

  public async setCollapsed(windowId: number, containerId: string, collapsed: boolean): Promise<void> {
    if (!await this.isEnabled()) {
      return;
    }
    const entry = await this.getMappingEntry(windowId, containerId);
    if (!entry) {
      return;
    }
    try {
      await this.nativeService.update(entry.nativeGroupId, { collapsed });
    } catch (error) {
      consoleService.output('NativeTabGroupCoordinator', 'warn', `Failed to set collapsed=${collapsed} for group ${entry.nativeGroupId}`, error);
    }
  }

  public async syncNativeGroupsFromContainer(containerId: string): Promise<void> {
    if (!await this.isEnabled()) {
      return;
    }
    const identity = await this.getContextualIdentity(containerId);
    if (!identity) {
      return;
    }
    const entries = await this.mappingStore.get(containerId);
    if (entries.length === 0) {
      return;
    }
    for (const entry of entries) {
      await this.syncNativeGroupFromContainer(entry.nativeGroupId, containerId, identity);
    }
  }

  public async syncContainerFromNativeGroup(group: NativeTabGroup, containerId: string): Promise<void> {
    const mappedColor = mapNativeColorToContainer(group.color);
    const params: Partial<{ name: string; color: string; icon: string; }> = {};
    if (group.title) {
      params.name = group.title;
    }
    if (mappedColor) {
      params.color = mappedColor;
    }
    if (Object.keys(params).length === 0) {
      return;
    }
    this.pendingContainerUpdates.add(containerId);
    try {
      await this.contextualIdentityFactory.setParams(containerId, params);
    } catch (error) {
      consoleService.output('NativeTabGroupCoordinator', 'warn', `Failed to update container ${containerId} from native group ${group.id}`, error);
    } finally {
      this.pendingContainerUpdates.delete(containerId);
    }
  }

  public async reorderNativeGroups(windowId: number, orderedContainerIds: string[]): Promise<void> {
    if (!await this.isEnabled()) {
      return;
    }
    let targetIndex = 0;
    for (const containerId of orderedContainerIds) {
      const entry = await this.getMappingEntry(windowId, containerId);
      if (!entry) {
        continue;
      }
      try {
        await this.nativeService.move(entry.nativeGroupId, { windowId, index: targetIndex });
        targetIndex += 1;
      } catch (error) {
        consoleService.output('NativeTabGroupCoordinator', 'warn', `Failed to move native group ${entry.nativeGroupId} to index ${targetIndex}`, error);
      }
    }
  }

  public async getGroupForWindow(windowId: number, containerId: string): Promise<NativeTabGroup | undefined> {
    if (!await this.isEnabled()) {
      return undefined;
    }
    const entry = await this.getMappingEntry(windowId, containerId);
    if (!entry) {
      return undefined;
    }
    try {
      return await this.nativeService.get(entry.nativeGroupId);
    } catch (_error) {
      // fallback below
    }
    try {
      const groups = await this.nativeService.query({ windowId });
      return groups.find((group) => group.id === entry.nativeGroupId);
    } catch (_error) {
      return undefined;
    }
  }

  private async syncNativeGroupFromContainer(groupId: number, containerId: string, identity: ContextualIdentity): Promise<void> {
    const nativeColor = mapContainerColorToNative(identity.color);
    const updatePayload: { title?: string; color?: string; } = {};
    if (identity.name) {
      updatePayload.title = identity.name;
    }
    if (nativeColor) {
      updatePayload.color = nativeColor;
    }
    if (Object.keys(updatePayload).length === 0) {
      return;
    }
    this.pendingNativeUpdates.add(groupId);
    try {
      await this.nativeService.update(groupId, updatePayload);
      await this.updateMappingLastKnownTitle(groupId, identity.name);
    } catch (error) {
      consoleService.output('NativeTabGroupCoordinator', 'warn', `Failed to update native group ${groupId} metadata`, error);
    } finally {
      this.pendingNativeUpdates.delete(groupId);
    }
  }

  private async handleNativeGroupUpdated(group: NativeTabGroup): Promise<void> {
    if (this.pendingNativeUpdates.has(group.id)) {
      return;
    }
    const match = await this.mappingStore.findContainerIdByGroupId(group.id);
    if (!match) {
      return;
    }
    await this.syncContainerFromNativeGroup(group, match.containerId);
    if (typeof group.title === 'string') {
      await this.updateMappingLastKnownTitle(group.id, group.title);
    }
  }

  private async handleContainerUpdated(containerId: string): Promise<void> {
    if (this.pendingContainerUpdates.has(containerId)) {
      return;
    }
    await this.syncNativeGroupsFromContainer(containerId);
  }

  private async getMappingEntry(windowId: number, containerId: string): Promise<NativeTabGroupMappingEntry | undefined> {
    const entries = await this.mappingStore.get(containerId);
    return entries.find((entry) => entry.windowId === windowId);
  }

  private async getContextualIdentity(containerId: string): Promise<ContextualIdentity | undefined> {
    try {
      return await this.contextualIdentityFactory.get(containerId);
    } catch (error) {
      consoleService.output('NativeTabGroupCoordinator', 'warn', `Failed to resolve contextual identity ${containerId}`, error);
      return {
        cookieStore: new CookieStore(containerId),
        icon: '',
        color: 'toolbar',
        name: containerId,
        iconUrl: '',
        colorCode: '',
      } as unknown as ContextualIdentity;
    }
  }

  private async updateMappingLastKnownTitle(groupId: number, title: string): Promise<void> {
    const match = await this.mappingStore.findContainerIdByGroupId(groupId);
    if (!match) {
      return;
    }
    await this.mappingStore.upsert(match.containerId, {
      windowId: match.entry.windowId,
      nativeGroupId: match.entry.nativeGroupId,
      lastKnownTitle: title,
    });
  }
}

ServiceRegistry.getInstance().registerService('NativeTabGroupCoordinator', NativeTabGroupCoordinator.getInstance());
