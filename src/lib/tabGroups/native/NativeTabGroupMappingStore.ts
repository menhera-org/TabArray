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

import { StorageItem } from 'weeg-storage';

import { ServiceRegistry } from '../../ServiceRegistry';
import { NativeTabGroupId } from './NativeTabGroupTypes';

export interface NativeTabGroupMappingEntry {
  nativeGroupId: NativeTabGroupId;
  lastKnownTitle?: string;
}

export type NativeTabGroupMappingTable = Record<string, NativeTabGroupMappingEntry>;

export class NativeTabGroupMappingStore {
  private static readonly STORAGE_KEY = 'NativeTabGroupMappingStore.mappings';
  private static readonly INSTANCE = new NativeTabGroupMappingStore();

  public static getInstance(): NativeTabGroupMappingStore {
    return NativeTabGroupMappingStore.INSTANCE;
  }

  private readonly storage = new StorageItem<NativeTabGroupMappingTable>(NativeTabGroupMappingStore.STORAGE_KEY, {}, StorageItem.AREA_LOCAL);

  private cache: NativeTabGroupMappingTable | undefined;

  private constructor() {
    this.storage.onChanged.addListener((value) => {
      this.cache = value;
    });
  }

  public async getAll(): Promise<NativeTabGroupMappingTable> {
    if (this.cache) {
      return this.cache;
    }
    const value = await this.storage.getValue();
    this.cache = value;
    return value;
  }

  public async get(containerId: string): Promise<NativeTabGroupMappingEntry | undefined> {
    const all = await this.getAll();
    return all[containerId];
  }

  public async set(containerId: string, entry: NativeTabGroupMappingEntry): Promise<void> {
    const all = await this.getAll();
    const next: NativeTabGroupMappingTable = {
      ... all,
      [containerId]: entry,
    };
    this.cache = next;
    await this.storage.setValue(next);
  }

  public async delete(containerId: string): Promise<void> {
    const all = await this.getAll();
    if (!(containerId in all)) {
      return;
    }
    const { [containerId]: _removed, ...rest } = all;
    const next: NativeTabGroupMappingTable = {
      ... rest,
    };
    this.cache = next;
    await this.storage.setValue(next);
  }

  public async findContainerIdByGroupId(groupId: NativeTabGroupId): Promise<string | undefined> {
    const all = await this.getAll();
    for (const [containerId, entry] of Object.entries(all)) {
      if (entry.nativeGroupId === groupId) {
        return containerId;
      }
    }
    return undefined;
  }
}

ServiceRegistry.getInstance().registerService('NativeTabGroupMappingStore', NativeTabGroupMappingStore.getInstance());
