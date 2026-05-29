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
import { Asserts } from "weeg-utils";
import { EventSink } from "weeg-events";
import { CompatTab } from "weeg-tabs";

type StorageType = {
  [cookieStoreId: string]: number[]; // tabIds
};

/**
 * This is only used in background scripts.
 */
export class OpenTabState {
  public readonly onContainerClosed = new EventSink<string>();

  private readonly _storage = new StorageItem<StorageType>('openTabState', {}, StorageItem.AREA_LOCAL);
  private _storageCache: StorageType | undefined;

  public constructor() {
    Asserts.assertBackgroundScript();
  }

  private getValue(): Promise<StorageType> {
    const value = this.tryGetValueSync();
    if (value) {
      return Promise.resolve(value);
    }
    return this._storage.getValue();
  }

  private tryGetValueSync(): StorageType | undefined {
    if (this._storageCache) {
      return structuredClone(this._storageCache);
    }
    return undefined;
  }

  private handleChange(oldValue: StorageType, newValue: StorageType): void {
    const oldCookieStoreIds = new Set(Object.keys(oldValue));
    const newCookieStoreIds = new Set(Object.keys(newValue));
    for (const cookieStoreId of oldCookieStoreIds) {
      if (!newCookieStoreIds.has(cookieStoreId)) {
        this.onContainerClosed.dispatch(cookieStoreId);
      }
    }
  }

  private setValue(value: StorageType): void {
    if (this._storageCache) {
      this.handleChange(this._storageCache, value);
      this._storageCache = value;
      this._storage.setValue(value).catch((e) => {
        console.error(e);
      });
    } else {
      this._storage.getValue().then((oldValue) => {
        this.handleChange(oldValue, value);
        this._storage.setValue(value).catch((e) => {
          console.error(e);
        });
      });
      this._storageCache = value;
    }
  }

  public setInitialTabs(tabs: Iterable<CompatTab>): void {
    const value: StorageType = {};
    for (const tab of tabs) {
      this.addTabIdInternal(tab.cookieStore.id, tab.id, value, false);
    }
    this.setValue(value);
  }

  private addTabIdInternal(cookieStoreId: string, tabId: number, value: StorageType, save = true): StorageType {
    const tabIds = value[cookieStoreId] ?? [];
    tabIds.push(tabId);
    value[cookieStoreId] = tabIds;
    if (save) this.setValue(value);
    return value;
  }

  public addTabId(cookieStoreId: string, tabId: number): void {
    const value = this.tryGetValueSync();
    if (value) {
      this.addTabIdInternal(cookieStoreId, tabId, value);
    } else {
      this.getValue().then((value) => {
        this.addTabIdInternal(cookieStoreId, tabId, value);
      });
    }
  }

  private removeTabIdInternal(tabId: number, value: StorageType): void {
    for (const cookieStoreId of Object.keys(value)) {
      const tabIds = value[cookieStoreId] as number[];
      const index = tabIds.indexOf(tabId);
      if (index !== -1) {
        tabIds.splice(index, 1);
        if (tabIds.length === 0) {
          delete value[cookieStoreId];
        }
        this.setValue(value);
        return;
      }
    }
  }

  public removeTabId(tabId: number): void {
    const value = this.tryGetValueSync();
    if (value) {
      this.removeTabIdInternal(tabId, value);
    } else {
      this.getValue().then((value) => {
        this.removeTabIdInternal(tabId, value);
      });
    }
  }
}
