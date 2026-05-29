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

export type ReadCachedStorageArea = "local" | "sync" | "managed";

/**
 * This is used to improve performance. It is safe to use in multiple contexts.
 */
export class ReadCachedStorageItem<T> extends StorageItem<T> {
  private _cachedValue: T | undefined;

  public constructor(key: string, defaultValue: T, storageArea: ReadCachedStorageArea) {
    super(key, defaultValue, storageArea);
    this.onChanged.addListener((value) => {
      this._cachedValue = value;
    });
  }

  public override async getValue(): Promise<T> {
    const syncValue = this.tryGetValueSync();
    if (undefined !== syncValue) {
      return syncValue;
    }
    const value = await super.getValue();
    this._cachedValue = value;
    return value;
  }

  public tryGetValueSync(): T | undefined {
    return this._cachedValue;
  }
}
