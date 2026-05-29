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

import browser from 'webextension-polyfill';
import { EventSink } from 'weeg-events';

export type StorageArea = 'local' | 'sync' | 'managed';

export class PrefixStorageItems<T> {
  public static readonly AREA_LOCAL = 'local';
  public static readonly AREA_SYNC = 'sync';
  public static readonly AREA_MANAGED = 'managed';

  public readonly prefix: string;
  public readonly areaName: StorageArea;
  private readonly area: browser.Storage.StorageArea;

  public readonly onChanged = new EventSink<[string, T]>();

  public constructor(prefix: string, area: StorageArea) {
    this.prefix = prefix;
    this.areaName = area;
    switch (area) {
      case PrefixStorageItems.AREA_LOCAL: {
        this.area = browser.storage.local;
        break;
      }

      case PrefixStorageItems.AREA_SYNC: {
        this.area = browser.storage.sync;
        break;
      }

      case PrefixStorageItems.AREA_MANAGED: {
        this.area = browser.storage.managed;
        break;
      }
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName != this.areaName) return;
      for (const origKey in changes) {
        const key = this.extractKey(origKey);
        if (key == null) continue;
        const value = (changes[origKey] as browser.Storage.StorageChange).newValue;
        this.onChanged.dispatch([key, value]);
      }
    });
  }

  private extractKey(origKey: string): string | undefined {
    if (!origKey.startsWith(this.prefix)) return undefined;
    return origKey.slice(this.prefix.length);
  }

  private getOrigKey(key: string): string {
    return this.prefix + key;
  }

  public async get(key: string): Promise<T | undefined> {
    const origKey = this.getOrigKey(key);
    const items = await this.area.get(origKey);
    return items[origKey];
  }

  public async delete(key: string): Promise<void> {
    if (this.areaName == 'managed') {
      throw new Error('Cannot set managed storage');
    }
    const origKey = this.getOrigKey(key);
    await this.area.remove(origKey);
  }

  public async has(key: string): Promise<boolean> {
    const origKey = this.getOrigKey(key);
    const items = await this.area.get(origKey);
    return origKey in items;
  }

  public async set(key: string, value: T): Promise<void> {
    if (this.areaName == 'managed') {
      throw new Error('Cannot set managed storage');
    }
    const origKey = this.getOrigKey(key);
    await this.area.set({ [origKey]: value });
  }

  public async getAll(): Promise<Record<string, T>> {
    const items = await this.area.get(null);
    const result: Record<string, T> = {};
    for (const origKey in items) {
      const key = this.extractKey(origKey);
      if (key == null) continue;
      result[key] = items[origKey];
    }
    return result;
  }

  public async setAll(items: Record<string, T>): Promise<void> {
    const oldItems = await this.getAll();
    const promises: Promise<void>[] = [];
    for (const key in oldItems) {
      if (!(key in items)) {
        promises.push(this.delete(key));
      }
    }
    for (const key in items) {
      promises.push(this.set(key, items[key] as T));
    }
    await Promise.all(promises);
  }
}
