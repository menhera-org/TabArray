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
import { EventSink } from 'weeg-events';

import { ServiceRegistry } from '../../ServiceRegistry';
import { ConsoleService } from '../../console/ConsoleService';
import { NativeTabGroupFeatureGate } from './NativeTabGroupFeatureGate';
import {
  NativeTabGroup,
  NativeTabGroupCreateInfo,
  NativeTabGroupId,
  NativeTabGroupMoveInfo,
  NativeTabGroupQueryInfo,
  NativeTabGroupsNamespace,
  NativeTabGroupUpdateInfo,
} from './NativeTabGroupTypes';

const consoleService = ConsoleService.getInstance();

const nativeTabGroupsApi = (browser as unknown as { tabGroups?: NativeTabGroupsNamespace }).tabGroups;

export class NativeTabGroupService {
  private static readonly INSTANCE = new NativeTabGroupService();

  public static getInstance(): NativeTabGroupService {
    return NativeTabGroupService.INSTANCE;
  }

  public readonly onGroupCreated = new EventSink<NativeTabGroup>();
  public readonly onGroupUpdated = new EventSink<NativeTabGroup>();
  public readonly onGroupMoved = new EventSink<NativeTabGroup>();
  public readonly onGroupRemoved = new EventSink<NativeTabGroup>();

  private readonly featureGate = NativeTabGroupFeatureGate.getInstance();

  private listenersRegistered = false;

  private constructor() {
    this.initialize().catch((error) => {
      consoleService.output('NativeTabGroupService', 'warn', 'Failed to initialize native tab groups', error);
    });
  }

  public async isEnabled(): Promise<boolean> {
    return await this.featureGate.isNativeTabGroupSupported();
  }

  public async query(queryInfo?: NativeTabGroupQueryInfo): Promise<NativeTabGroup[]> {
    const api = await this.getApiOrThrow();
    return await api.query(queryInfo);
  }

  public async create(createInfo: NativeTabGroupCreateInfo): Promise<NativeTabGroup> {
    const api = await this.getApiOrThrow();
    return await api.create(createInfo);
  }

  public async update(groupId: NativeTabGroupId, updateInfo: NativeTabGroupUpdateInfo): Promise<NativeTabGroup> {
    const api = await this.getApiOrThrow();
    return await api.update(groupId, updateInfo);
  }

  public async move(groupId: NativeTabGroupId, moveInfo: NativeTabGroupMoveInfo): Promise<NativeTabGroup> {
    const api = await this.getApiOrThrow();
    return await api.move(groupId, moveInfo);
  }

  public async remove(groupId: NativeTabGroupId): Promise<void> {
    const api = await this.getApiOrThrow();
    await api.remove(groupId);
  }

  private async initialize(): Promise<void> {
    const supported = await this.isEnabled();
    if (!supported) {
      consoleService.output('NativeTabGroupService', 'info', 'Native tab groups are not available in this browser.');
      return;
    }

    if (!nativeTabGroupsApi) {
      // Should not happen if supported is true, but guard anyway.
      throw new Error('browser.tabGroups namespace is missing.');
    }

    this.registerListeners(nativeTabGroupsApi);
  }

  private registerListeners(api: NativeTabGroupsNamespace): void {
    if (this.listenersRegistered) {
      return;
    }

    api.onCreated.addListener(this.handleGroupCreated);
    api.onUpdated.addListener(this.handleGroupUpdated);
    api.onMoved.addListener(this.handleGroupMoved);
    api.onRemoved.addListener(this.handleGroupRemoved);

    this.listenersRegistered = true;
  }

  private readonly handleGroupCreated = (group: NativeTabGroup): void => {
    this.onGroupCreated.dispatch(group);
  };

  private readonly handleGroupUpdated = (group: NativeTabGroup): void => {
    this.onGroupUpdated.dispatch(group);
  };

  private readonly handleGroupMoved = (group: NativeTabGroup): void => {
    this.onGroupMoved.dispatch(group);
  };

  private readonly handleGroupRemoved = (group: NativeTabGroup): void => {
    this.onGroupRemoved.dispatch(group);
  };

  private async getApiOrThrow(): Promise<NativeTabGroupsNamespace> {
    await this.featureGate.assertNativeSupport();

    if (!nativeTabGroupsApi) {
      throw new Error('Native tab groups API is unavailable.');
    }
    return nativeTabGroupsApi;
  }
}

ServiceRegistry.getInstance().registerService('NativeTabGroupService', NativeTabGroupService.getInstance());
