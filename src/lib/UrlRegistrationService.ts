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

import { ServiceRegistry } from "./ServiceRegistry";
import { StartupService } from "./StartupService";

type StorageType = {
  [urlId: string]: string; // url
};

const startupService = StartupService.getInstance();

const getRandomId = (): string => {
  const byteArray = new Uint8Array(16);
  crypto.getRandomValues(byteArray);
  return byteArray.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
};

export class UrlRegistrationService {
  private static readonly INSTANCE = new UrlRegistrationService();

  public static getInstance(): UrlRegistrationService {
    return this.INSTANCE;
  }

  private readonly _storage = new StorageItem<StorageType>('registeredUrls', {}, StorageItem.AREA_LOCAL);

  private constructor() {
    // nothing
  }

  public async resetStorage(): Promise<void> {
    await this._storage.setValue({});
  }

  public async registerUrl(url: string): Promise<string> {
    new URL(url); // throws for invalid URLs
    const storage = await this._storage.getValue();
    const urlId = getRandomId();
    storage[urlId] = url;
    await this._storage.setValue(storage);
    return urlId;
  }

  public async getUrl(urlId: string): Promise<string | null> {
    const storage = await this._storage.getValue();
    return storage[urlId] ?? null;
  }

  public async getAndRevokeUrl(urlId: string): Promise<string | null> {
    const storage = await this._storage.getValue();
    const url = storage[urlId] ?? null;
    delete storage[urlId];
    await this._storage.setValue(storage);
    return url;
  }
}

ServiceRegistry.getInstance().registerService('UrlRegistrationService', UrlRegistrationService.getInstance());

startupService.onStartup.addListener(() => {
  UrlRegistrationService.getInstance().resetStorage().catch((e) => {
    console.error(e);
  });
});
