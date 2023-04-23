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
import { Uint32 } from "weeg-types";

import { ServiceRegistry } from "./ServiceRegistry";

type StorageType = {
  currentUrlId: number;
  [urlId: number]: string; // url
};

export class UrlRegistrationService {
  private static readonly INSTANCE = new UrlRegistrationService();

  public static getInstance(): UrlRegistrationService {
    return this.INSTANCE;
  }

  private readonly _storage = new StorageItem<StorageType>('registeredUrls', { currentUrlId: 1 }, StorageItem.AREA_LOCAL);

  private constructor() {
    // nothing
  }

  private validateUrlId(urlId: number): void {
    if (!Uint32.isUint32(urlId)) {
      throw new Error('Invalid urlId');
    }
  }

  public async resetStorage(): Promise<void> {
    await this._storage.setValue({ currentUrlId: 1 });
  }

  public async registerUrl(url: string): Promise<number> {
    new URL(url); // throws for invalid URLs
    const storage = await this._storage.getValue();
    const urlId = storage.currentUrlId;
    storage[urlId] = url;
    storage.currentUrlId++;
    await this._storage.setValue(storage);
    return urlId;
  }

  public async getUrl(urlId: number): Promise<string | null> {
    this.validateUrlId(urlId);
    const storage = await this._storage.getValue();
    return storage[urlId] ?? null;
  }

  public async getAndRevokeUrl(urlId: number): Promise<string | null> {
    this.validateUrlId(urlId);
    const storage = await this._storage.getValue();
    const url = storage[urlId] ?? null;
    delete storage[urlId];
    await this._storage.setValue(storage);
    return url;
  }
}

ServiceRegistry.getInstance().registerService('UrlRegistrationService', UrlRegistrationService.getInstance());
