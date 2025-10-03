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
  windowId: number;
  nativeGroupId: NativeTabGroupId;
  lastKnownTitle?: string;
}

export interface NativeTabGroupMappingMatch {
  containerId: string;
  entry: NativeTabGroupMappingEntry;
}

export type NativeTabGroupMappingTable = Record<string, NativeTabGroupMappingEntry[]>;

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
    const rawValue = await this.storage.getValue();
    const { normalized, changed } = this.normalizeValue(rawValue);
    if (changed) {
      await this.storage.setValue(normalized);
    }
    this.cache = normalized;
    return normalized;
  }

  public async get(containerId: string): Promise<NativeTabGroupMappingEntry[]> {
    const all = await this.getAll();
    const entries = all[containerId];
    if (!entries) {
      return [];
    }
    return [... entries];
  }

  public async upsert(containerId: string, entry: NativeTabGroupMappingEntry): Promise<void> {
    const all = await this.getAll();
    const existingEntries = all[containerId] ?? [];
    const nextEntries = existingEntries.slice();
    const index = nextEntries.findIndex((candidate) => candidate.windowId === entry.windowId);
    if (index >= 0) {
      nextEntries[index] = entry;
    } else {
      nextEntries.push(entry);
    }
    const next: NativeTabGroupMappingTable = {
      ... all,
      [containerId]: nextEntries,
    };
    this.cache = next;
    await this.storage.setValue(next);
  }

  public async delete(containerId: string, windowId?: number): Promise<void> {
    const all = await this.getAll();
    if (!(containerId in all)) {
      return;
    }

    if (windowId === undefined) {
      const { [containerId]: _removed, ...rest } = all;
      const next: NativeTabGroupMappingTable = {
        ... rest,
      };
      this.cache = next;
      await this.storage.setValue(next);
      return;
    }

    const entries = all[containerId] ?? [];
    const filtered = entries.filter((entry) => entry.windowId !== windowId);

    if (filtered.length === entries.length) {
      return;
    }

    if (filtered.length === 0) {
      const { [containerId]: _removed, ...rest } = all;
      const next: NativeTabGroupMappingTable = {
        ... rest,
      };
      this.cache = next;
      await this.storage.setValue(next);
      return;
    }

    const next: NativeTabGroupMappingTable = {
      ... all,
      [containerId]: filtered,
    };
    this.cache = next;
    await this.storage.setValue(next);
  }

  public async findContainerIdByGroupId(groupId: NativeTabGroupId): Promise<NativeTabGroupMappingMatch | undefined> {
    const all = await this.getAll();
    for (const [containerId, entries] of Object.entries(all)) {
      for (const entry of entries) {
        if (entry.nativeGroupId === groupId) {
          return {
            containerId,
            entry,
          };
        }
      }
    }
    return undefined;
  }

  private normalizeValue(value: NativeTabGroupMappingTable): { normalized: NativeTabGroupMappingTable; changed: boolean } {
    const normalized: NativeTabGroupMappingTable = {};
    let changed = false;
    const rawEntries = value as unknown as Record<string, unknown>;
    for (const [containerId, rawEntry] of Object.entries(rawEntries)) {
      let normalizedEntries: NativeTabGroupMappingEntry[] = [];
      if (Array.isArray(rawEntry)) {
        const filtered: NativeTabGroupMappingEntry[] = [];
        for (const candidate of rawEntry) {
          if (this.isValidEntry(candidate)) {
            filtered.push({
              windowId: candidate.windowId,
              nativeGroupId: candidate.nativeGroupId,
              lastKnownTitle: candidate.lastKnownTitle,
            });
          }
        }
        if (filtered.length > 0) {
          normalizedEntries = filtered;
        }
        if (filtered.length !== rawEntry.length) {
          changed = true;
        }
      } else if (rawEntry && typeof rawEntry === 'object') {
        const legacy = rawEntry as Partial<NativeTabGroupMappingEntry> & { nativeGroupId?: NativeTabGroupId; windowId?: number; lastKnownTitle?: string; };
        if (typeof legacy.nativeGroupId === 'number' && typeof legacy.windowId === 'number') {
          normalizedEntries = [{
            windowId: legacy.windowId,
            nativeGroupId: legacy.nativeGroupId,
            lastKnownTitle: typeof legacy.lastKnownTitle === 'string' ? legacy.lastKnownTitle : undefined,
          }];
        }
        changed = true;
      } else {
        changed = true;
      }

      if (normalizedEntries.length > 0) {
        normalized[containerId] = normalizedEntries;
      }
    }
    return {
      normalized,
      changed,
    };
  }

  private isValidEntry(entry: unknown): entry is NativeTabGroupMappingEntry {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const candidate = entry as Record<string, unknown>;
    return typeof candidate.nativeGroupId === 'number' && typeof candidate.windowId === 'number';
  }
}

ServiceRegistry.getInstance().registerService('NativeTabGroupMappingStore', NativeTabGroupMappingStore.getInstance());
