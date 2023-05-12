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

import { Asserts } from "weeg-utils";

import { CachedStorageItem } from "../storage/CachedStorageItem";

import { ServiceRegistry } from "../ServiceRegistry";

export type OpenTabsStorageType = number[];

// only allow access from background script
Asserts.assertBackgroundScript();

export class OpenTabsService {
  private static readonly STORAGE_KEY = "openTabs";

  private static readonly INSTANCE = new OpenTabsService();

  public static getInstance(): OpenTabsService {
    return OpenTabsService.INSTANCE;
  }

  private readonly _storage = new CachedStorageItem<OpenTabsStorageType>(OpenTabsService.STORAGE_KEY, [], CachedStorageItem.AREA_LOCAL);

  private constructor() {
    // nothing.
  }

  public async getValue(): Promise<OpenTabsStorageType> {
    return this._storage.getValue();
  }

  public async setValue(value: OpenTabsStorageType): Promise<void> {
    return this._storage.setValue(value);
  }

  public async removeTab(tabId: number): Promise<void> {
    this._storage.doUpdateTransaction((value) => {
      const index = value.indexOf(tabId);
      if (index !== -1) {
        value.splice(index, 1);
      }
      return value;
    });
  }

  public async addTab(tabId: number): Promise<void> {
    this._storage.doUpdateTransaction((value) => {
      const index = value.indexOf(tabId);
      if (index === -1) {
        value.push(tabId);
      }
      return value;
    });
  }

  public async hasTab(tabId: number): Promise<boolean> {
    const value = await this.getValue();
    return value.indexOf(tabId) !== -1;
  }
}

ServiceRegistry.getInstance().registerService('OpenTabsService', OpenTabsService.getInstance());
