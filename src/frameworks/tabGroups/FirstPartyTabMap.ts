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

import browser from 'webextension-polyfill';
import { Tab } from "../tabs";
import { UrlService } from '../dns';
import { HostnameService } from '../dns';
import { FirstPartyService } from './FirstPartyService';

type ImplementedMap = ReadonlyMap<string, ReadonlyArray<Tab>>;

export class FirstPartyTabMap implements ImplementedMap {
  private static readonly firstPartyService = FirstPartyService.getInstance();

  public static async create(isPrivate = false): Promise<FirstPartyTabMap> {
    const browserTabs = await browser.tabs.query({});
    await this.firstPartyService.initialized;
    const tabs = [];
    for (const browserTab of browserTabs) {
      if (browserTab.incognito != isPrivate) {
        continue;
      }
      tabs.push(new Tab(browserTab));
    }
    return new FirstPartyTabMap(tabs);
  }

  private readonly urlService = UrlService.getInstance();
  private readonly hostnameService = HostnameService.getInstance();
  private tabMap = new Map<string, Tab[]>();

  private constructor(tabs: Tab[]) {
    for (const tab of tabs) {
      const url = new URL(tab.url);
      if (!this.urlService.isHttpScheme(url)) {
        continue;
      }
      if (this.hostnameService.isHostnameIpAddress(url.href)) {
        continue;
      }
      const registrableDomain = FirstPartyTabMap.firstPartyService.getRegistrableDomain(url);
      if (!registrableDomain) {
        continue;
      }
      const firstPartyTabs = this.tabMap.get(registrableDomain) || [];
      this.tabMap.set(registrableDomain, firstPartyTabs);
      firstPartyTabs.push(tab);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public forEach(callbackfn: (value: readonly Tab[], key: string, map: ImplementedMap) => void, thisArg?: any): void {
    this.tabMap.forEach(callbackfn, thisArg);
  }

  public get(key: string): readonly Tab[] | undefined {
    return this.tabMap.get(key);
  }

  public has(key: string): boolean {
    return this.tabMap.has(key);
  }

  public get size(): number {
    return this.tabMap.size;
  }

  public * entries(): IterableIterator<[string, readonly Tab[]]> {
    const keys = this.keys();
    for (const key of keys) {
      const value = this.tabMap.get(key);
      if (!value) {
        // this should never happen
        continue;
      }
      yield [key, value];
    }
  }

  public keys(): IterableIterator<string> {
    return [... this.tabMap.keys()].sort((a, b) => this.hostnameService.compareDomains(a, b)).values();
  }

  public values(): IterableIterator<readonly Tab[]> {
    return this.tabMap.values();
  }

  public [Symbol.iterator](): IterableIterator<[string, readonly Tab[]]> {
    return this.entries();
  }
}
