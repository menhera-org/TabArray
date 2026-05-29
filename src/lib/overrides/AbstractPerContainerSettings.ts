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

import { EventSink } from "weeg-events";
import { StorageItem } from "weeg-storage";
import { Asserts } from "weeg-utils";

import { PerContainerSettings } from "./PerContainerSettings";

/**
 * Per-container proxy presets.
 */
export abstract class AbstractPerContainerSettings<T> implements PerContainerSettings<T> {
  public readonly onChanged = new EventSink<void>();

  private readonly _storage: StorageItem<Record<string, T>>;
  private _storageCache: Record<string, T> | undefined;

  protected abstract getStorageKey(): string;

  protected constructor() {
    Asserts.assertTopLevelInBackgroundScript();
    this._storage = new StorageItem<Record<string, T>>(this.getStorageKey(), {}, StorageItem.AREA_LOCAL);
    this._storage.onChanged.addListener((value) => {
      this._storageCache = value;
      this.onChanged.dispatch();
    });
  }

  public async removeUnknownTabGroupIds(knownTabGroupIds: Iterable<string>): Promise<void> {
    const knownTabGroupIdSet = new Set(knownTabGroupIds);
    const value = await this.getValue();
    for (const tabGroupId in value) {
      if (!knownTabGroupIdSet.has(tabGroupId)) {
        delete value[tabGroupId];
      }
    }
    await this.setValue(value);
  }

  protected async getValue(): Promise<Record<string, T>> {
    if (undefined !== this._storageCache) {
      return this._storageCache;
    }
    const value = await this._storage.getValue();
    this._storageCache = value;
    return value;
  }

  protected async setValue(value: Record<string, T>): Promise<void> {
    await this._storage.setValue(value);
  }

  public async getTabGroupIds(): Promise<string[]> {
    const value = await this.getValue();
    return Object.keys(value);
  }

  public async removeTabGroup(tabGroupId: string): Promise<void> {
    const value = await this.getValue();
    delete value[tabGroupId];
    await this.setValue(value);
  }

  /**
   * Sets a per-container value without any checks.
   */
  protected async rawSetValueForTabGroup(tabGroupId: string, value: T): Promise<void> {
    const storageValue = await this.getValue();
    storageValue[tabGroupId] = value;
    await this.setValue(storageValue);
  }

  public abstract setValueForTabGroup(tabGroupId: string, value: T): Promise<void>;

  public async getValueForTabGroup(tabGroupId: string): Promise<T | undefined> {
    const value = await this.getValue();
    return value[tabGroupId];
  }
}
