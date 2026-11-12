/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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
import { EventSink } from 'weeg-events';

import { ContextualIdentityService } from '../tabGroups/ContextualIdentityService';
import { ExternalServiceProvider } from '../ExternalServiceProvider';
import { CookieProvider } from './CookieProvider';

export type OriginStorageStatistics = {
  origin: string;
  hasLocalStorage: boolean;
};

export type FirstPartyStorageStatistics = Record<string, OriginStorageStatistics>; // by origin
export type CookieStoreStorageStatistics = Record<string, FirstPartyStorageStatistics>; // by first-party domain
type StorageType = Record<string, CookieStoreStorageStatistics>; // by cookie store ID

/**
 * First party domain can be empty for non-isolated cookie stores.
 */
export class ContentStorageStatistics {
  private readonly _storageItem = new StorageItem<StorageType>(
    'content.storage.statistics.firstPartyIsolated',
    {},
    StorageItem.AREA_LOCAL
  );
  private readonly _serviceProvider = ExternalServiceProvider.getInstance();
  private readonly _registrableDomainService = this._serviceProvider.registrableDomainService;
  private readonly _hostnameService = this._serviceProvider.hostnameService;

  public readonly cookieProvider = new CookieProvider();
  public readonly onChanged = new EventSink<void>();

  public constructor() {
    this._storageItem.observe(() => this.onChanged.dispatch(), false);

    ContextualIdentityService.getInstance()
      .getFactory()
      .onRemoved.addListener((contextualIdentity) => {
        this.removeCookieStore(contextualIdentity.cookieStore.id);
      });
  }

  public async getStorageFirstPartyDomainList(cookieStoreId: string): Promise<string[]> {
    const storage = await this._storageItem.getValue();
    return Object.keys(storage[cookieStoreId] ?? {});
  }

  /**
   * This returns a list of origins in the cookie store that have local storage.
   */
  public async getStorageOriginList(cookieStoreId: string, firstPartyDomain: string): Promise<string[]> {
    const storage = await this._storageItem.getValue();
    const firstPartyStorage = storage[cookieStoreId]?.[firstPartyDomain] ?? {};
    return Object.keys(firstPartyStorage).filter((origin) => firstPartyStorage[origin]?.hasLocalStorage);
  }

  public async getOriginStatistics(
    cookieStoreId: string,
    firstPartyDomain: string,
    origin: string
  ): Promise<OriginStorageStatistics | undefined> {
    const storage = await this._storageItem.getValue();
    return storage[cookieStoreId]?.[firstPartyDomain]?.[origin];
  }

  public async setOriginStatistics(
    cookieStoreId: string,
    firstPartyDomain: string,
    origin: string,
    statistics: OriginStorageStatistics
  ): Promise<void> {
    // TODO: if statistics model is extended, this should be updated to only remove the origin if it has no data.
    if (statistics.hasLocalStorage === false) {
      await this.removeOriginStatistics(cookieStoreId, firstPartyDomain, origin);
      return;
    }

    const storage = await this._storageItem.getValue();
    const stored = storage[cookieStoreId]?.[firstPartyDomain]?.[origin];
    // Every write is copied to every storage listener in every extension page, so skip unchanged ones.
    if (stored?.origin == statistics.origin && stored.hasLocalStorage == statistics.hasLocalStorage) return;
    const cookieStoreStorage = (storage[cookieStoreId] ??= {});
    (cookieStoreStorage[firstPartyDomain] ??= {})[origin] = statistics;
    await this._storageItem.setValue(storage);
  }

  public async removeOriginStatistics(cookieStoreId: string, firstPartyDomain: string, origin: string): Promise<void> {
    const storage = await this._storageItem.getValue();
    const cookieStoreStorage = storage[cookieStoreId];
    const firstPartyStorage = cookieStoreStorage?.[firstPartyDomain];
    if (!cookieStoreStorage || !firstPartyStorage) return;
    delete firstPartyStorage[origin];
    if (Object.keys(firstPartyStorage).length === 0) {
      delete cookieStoreStorage[firstPartyDomain];
    }
    await this._storageItem.setValue(storage);
  }

  public async removeCookieStore(cookieStoreId: string): Promise<void> {
    const storage = await this._storageItem.getValue();
    delete storage[cookieStoreId];
    await this._storageItem.setValue(storage);
  }

  /**
   * This returns a list of first party domains in the cookie store that have local storage or cookies.
   */
  public async getFirstPartyDomainList(cookieStoreId: string): Promise<string[]> {
    const [storageFirstPartyDomains, cookieFirstPartyDomains] = await Promise.all([
      this.getStorageFirstPartyDomainList(cookieStoreId),
      this.cookieProvider.getFirstPartyDomainsForCookieStoreId(cookieStoreId),
    ]);
    return this._hostnameService.sortDomains(new Set([...storageFirstPartyDomains, ...cookieFirstPartyDomains]));
  }

  /**
   * This returns a list of domains in the cookie store that have local storage or cookies.
   */
  public async getDomainList(cookieStoreId: string, firstPartyDomain: string): Promise<string[]> {
    const [origins, cookieDomains] = await Promise.all([
      this.getStorageOriginList(cookieStoreId, firstPartyDomain),
      this.cookieProvider.getCookieDomainsForFirstPartyDomain(cookieStoreId, firstPartyDomain),
    ]);
    // Opaque origins were stored as "null" before 12.0.0; they have no host to show.
    const storageDomains = origins
      .filter((origin) => URL.canParse(origin))
      .map((origin) => new URL(origin).hostname)
      .filter((hostname) => hostname != '');
    return this._hostnameService.sortDomains(new Set([...storageDomains, ...cookieDomains]));
  }

  public async getRegistrableDomainList(cookieStoreId: string, firstPartyDomain: string): Promise<string[]> {
    const domains = await this.getDomainList(cookieStoreId, firstPartyDomain);
    return await this._registrableDomainService.getUniqueRegistrableDomains(
      domains.map((domain) => `http://${domain}`)
    );
  }
}
