// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import { StorageItem } from "weeg-storage";
import { HostnameService } from "weeg-domains";
import { PromiseUtils } from "weeg-utils";

import { OriginAttributes } from "./OriginAttributes";
import { TabGroup } from "./TabGroup";
import { RegistrableDomainService } from "../dns";

type PublicSuffixListData = {
  rules: string[];
  exceptionRules: string[];
  updatedTime: number;
  initialized: boolean;
};

export class FirstPartyService {
  private static readonly PSL_STORAGE_KEY = "weeg.dns.publicSuffixList";
  private static readonly PSL_UPDATE_INTERVAL = 1000 * 60 * 60 * 24; // 1 day

  // This must be at the end of static definitions.
  private static readonly INSTANCE = new FirstPartyService();

  private readonly hostnameService = HostnameService.getInstance();
  private readonly registrableDomainService = new RegistrableDomainService();
  private readonly publicSuffixListStorage = new StorageItem<PublicSuffixListData>(FirstPartyService.PSL_STORAGE_KEY, {
    rules: [],
    exceptionRules: [],
    updatedTime: 0,
    initialized: false,
  }, StorageItem.AREA_LOCAL);
  private readonly initializationPromise = PromiseUtils.createPromise<void>();
  private updatedTime = -Infinity;

  public static getInstance(): FirstPartyService {
    return FirstPartyService.INSTANCE;
  }

  private constructor() {
    this.publicSuffixListStorage.getValue().then((value) => {
      if (!value.initialized) {
        this.updatePublicSuffixList().catch((e) => {
          console.error(e);
        });
      } else {
        this.registrableDomainService.importRules(value.rules, value.exceptionRules);
        this.initializationPromise.resolve();
        if (Date.now() - value.updatedTime >= FirstPartyService.PSL_UPDATE_INTERVAL) {
          this.updatePublicSuffixList().catch((e) => {
            console.error(e);
          });
        }
      }
    }).catch((e) => {
      console.error(e);
    });
    console.assert(FirstPartyService.PSL_UPDATE_INTERVAL > 0);
    setInterval(() => {
      this.updatePublicSuffixList().catch((e) => {
        console.error(e);
      });
    }, FirstPartyService.PSL_UPDATE_INTERVAL);
  }

  private recentlyUpdated(): boolean {
    return Date.now() - this.updatedTime < FirstPartyService.PSL_UPDATE_INTERVAL;
  }

  public async updatePublicSuffixList(): Promise<void> {
    if (this.recentlyUpdated()) {
      return;
    }
    let {updatedTime} = await this.publicSuffixListStorage.getValue();
    this.updatedTime = updatedTime;
    if (this.recentlyUpdated()) {
      return;
    }
    await this.registrableDomainService.updateRules();
    const { rules, exceptionRules } = this.registrableDomainService.exportRules();
    updatedTime = Date.now();
    await this.publicSuffixListStorage.setValue({ rules, exceptionRules, updatedTime, initialized: true });
    this.initializationPromise.resolve();
  }

  public get initialized(): Promise<void> {
    return this.initializationPromise.promise;
  }

  public getRegistrableDomain(url: URL): string {
    this.updatePublicSuffixList().catch((e) => {
      console.error(e);
    });
    return this.registrableDomainService.getRegistrableDomain(url.href);
  }

  public async closeTabsByFirstPartyDomain(domain: string): Promise<void> {
    const originAttributes = new OriginAttributes(domain);
    const tabGroup = await TabGroup.createTabGroup(originAttributes);
    await tabGroup.tabList.closeTabs();
  }

  public getUniqueFirstPartyDomains(domains: Iterable<string>): string[] {
    const uniqueDomains = new Set<string>();
    for (const domain of domains) {
      if (domain === '') {
        continue;
      }
      const url = new URL(`http://${domain}`);
      if (this.hostnameService.isHostnameIpAddress(url.href)) {
        uniqueDomains.add(domain);
        continue;
      }
      uniqueDomains.add(this.getRegistrableDomain(url));
    }
    return this.hostnameService.sortDomains(uniqueDomains);
  }
}
