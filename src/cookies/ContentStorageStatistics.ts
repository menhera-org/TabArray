// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
  Container Tab Groups
  Copyright (C) 2022 Menhera.org

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
*/

import { StorageArea, StorageItem } from "../frameworks/storage";
import { EventSink } from "../frameworks/utils";
import { CookieProvider } from "../frameworks/cookies";
import { FirstPartyService } from "../frameworks/tabGroups";
import { HostnameService } from "../frameworks/dns";

export type OriginStorageStatistics = {
  origin: string;
  hasLocalStorage: boolean;
};

export type FirstPartyStorageStatistics = {
  [origin: string]: OriginStorageStatistics;
};

export type CookieStoreStorageStatistics = {
  [firstPartyDomain: string]: FirstPartyStorageStatistics;
};

export type StorageType = {
  [cookieStoreId: string]: CookieStoreStorageStatistics;
};

/**
 * First party domain can be empty for non-isolated cookie stores.
 */
export class ContentStorageStatistics {
  private static readonly _STORAGE_KEY = 'content.storage.statistics.firstPartyIsolated';
  private readonly _storageItem = new StorageItem<StorageType>(ContentStorageStatistics._STORAGE_KEY, {}, StorageArea.LOCAL);
  private readonly _firstPartyService = FirstPartyService.getInstance();
  private readonly _hostnameService = HostnameService.getInstance();

  public readonly cookieProvider = new CookieProvider();
  public readonly onChanged = new EventSink<void>();

  public constructor() {
    this._storageItem.observe(() => {
      this.onChanged.dispatch();
    }, false);
  }

  public async getStorageFirstPartyDomainList(cookieStoreId: string): Promise<string[]> {
    const storage = await this._storageItem.getValue();
    const cookieStoreStorage = storage[cookieStoreId];
    if (!cookieStoreStorage) return [];
    return Object.keys(cookieStoreStorage);
  }

  /**
   * This returns a list of origins in the cookie store that have local storage.
   */
  public async getStorageOriginList(cookieStoreId: string, firstPartyDomain: string): Promise<string[]> {
    const storage = await this._storageItem.getValue();
    const cookieStoreStorage = storage[cookieStoreId];
    if (!cookieStoreStorage) return [];
    const firstPartyStorage = cookieStoreStorage[firstPartyDomain];
    if (!firstPartyStorage) return [];
    return Object.keys(firstPartyStorage);
  }

  public async getOriginStatistics(cookieStoreId: string, firstPartyDomain: string, origin: string): Promise<OriginStorageStatistics | undefined> {
    const storage = await this._storageItem.getValue();
    const cookieStoreStorage = storage[cookieStoreId];
    if (!cookieStoreStorage) return undefined;
    const firstPartyStorage = cookieStoreStorage[firstPartyDomain];
    if (!firstPartyStorage) return undefined;
    return firstPartyStorage[origin];
  }

  public async setOriginStatistics(cookieStoreId: string, firstPartyDomain: string, origin: string, statistics: OriginStorageStatistics): Promise<void> {
    const storage = await this._storageItem.getValue();
    let cookieStoreStorage = storage[cookieStoreId];
    if (!cookieStoreStorage) {
      cookieStoreStorage = {};
      storage[cookieStoreId] = cookieStoreStorage;
    }
    let firstPartyStorage = cookieStoreStorage[firstPartyDomain];
    if (!firstPartyStorage) {
      firstPartyStorage = {};
      cookieStoreStorage[firstPartyDomain] = firstPartyStorage;
    }
    firstPartyStorage[origin] = statistics;
    await this._storageItem.setValue(storage);
  }

  /**
   * This returns a list of first party domains in the cookie store that have local storage or cookies.
   */
  public async getFirstPartyDomainList(cookieStoreId: string): Promise<string[]> {
    const storageFirstPartyDomains = await this.getStorageFirstPartyDomainList(cookieStoreId);
    const cookieFirstPartyDomains = await this.cookieProvider.getFirstPartyDomainsForCookieStoreId(cookieStoreId);
    return this._hostnameService.sortDomains(new Set([
      ... storageFirstPartyDomains,
      ... cookieFirstPartyDomains,
    ]));
  }

  /**
   * This returns a list of domains in the cookie store that have local storage or cookies.
   */
  public async getDomainList(cookieStoreId: string, firstPartyDomain: string): Promise<string[]> {
    const origins = await this.getStorageOriginList(cookieStoreId, firstPartyDomain);
    const storageDomains = origins.map((origin) => new URL(origin).hostname);
    const cookieDomains = await this.cookieProvider.getCookieDomainsForFirstPartyDomain(cookieStoreId, firstPartyDomain);
    return this._hostnameService.sortDomains(new Set([
      ... storageDomains,
      ... cookieDomains,
    ]));
  }

  public async getRegistrableDomainList(cookieStoreId: string, firstPartyDomain: string): Promise<string[]> {
    const domains = await this.getDomainList(cookieStoreId, firstPartyDomain);
    await this._firstPartyService.initialized;
    return this._firstPartyService.getUniqueFirstPartyDomains(domains);
  }
}
