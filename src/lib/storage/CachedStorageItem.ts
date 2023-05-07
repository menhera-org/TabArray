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

export type CachedStorageUpdateCallback<T> = (value: T) => T;

/**
 * This should only be used in a single context (e.g. background page).
 * In this condition, this ensures that the updates are atomic and processed in the requested order.
 */
export class CachedStorageItem<T> extends StorageItem<T> {
  private _cachedValue: T | undefined;
  private _isUpdating = false;
  private readonly _updateQueue: CachedStorageUpdateCallback<T>[] = [];

  public override async getValue(): Promise<T> {
    const syncValue = this.tryGetValueSync();
    if (undefined != syncValue) {
      return syncValue;
    }
    const value = await super.getValue();
    {
      const syncValue = this.tryGetValueSync();
      if (undefined !== syncValue) {
        return syncValue;
      }
    }
    this._cachedValue = value;
    return value;
  }

  public tryGetValueSync(): T | undefined {
    return structuredClone(this._cachedValue);
  }

  public override setValue(value: T): Promise<void> {
    value = structuredClone(value);
    this._cachedValue = value;
    return super.setValue(value);
  }

  public override clearValue(): Promise<void> {
    this._cachedValue = structuredClone(this.defaultValue);
    return super.clearValue();
  }

  public doUpdateTransaction(callback: CachedStorageUpdateCallback<T>): void {
    const syncValue = this.tryGetValueSync();
    if (syncValue !== undefined) {
      const newValue = callback(syncValue);
      this.setValue(newValue).catch((e) => {
        console.error(e);
      });
      return;
    }
    if (this._isUpdating) {
      this._updateQueue.push(callback);
      return;
    }
    this._isUpdating = true;
    this._updateQueue.push(callback);
    this.getValue().then((value) => {
      this._isUpdating = false;
      for (const callback of this._updateQueue) {
        value = callback(value);
      }
      this._updateQueue.length = 0;
      this.setValue(value).catch((e) => {
        console.error(e);
      });
    });
  }
}
