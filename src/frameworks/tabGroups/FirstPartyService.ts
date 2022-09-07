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

import { dns } from "..";
import { storage } from "..";
import { utils } from "..";

const { PromiseUtils } = utils;

type PublicSuffixListData = {
  rules: string[];
  exceptionRules: string[];
  updatedTime: number;
  initialized: boolean;
};

export class FirstPartyService {
  private static PSL_STORAGE_KEY = "weeg.dns.publicSuffixList";
  private static PSL_UPDATE_INTERVAL = 1000 * 60 * 60 * 24; // 1 day

  // This must be at the end of static definitions.
  private static INSTANCE = new FirstPartyService();

  private readonly registrableDomainService = new dns.RegistrableDomainService();
  private readonly publicSuffixListStorage = new storage.StorageItem<PublicSuffixListData>(FirstPartyService.PSL_STORAGE_KEY, {
    rules: [],
    exceptionRules: [],
    updatedTime: 0,
    initialized: false,
  }, storage.StorageArea.LOCAL);
  private readonly initializationPromise = PromiseUtils.createPromise<void>();

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
        if (Date.now() - value.updatedTime > FirstPartyService.PSL_UPDATE_INTERVAL) {
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

  public async updatePublicSuffixList(): Promise<void> {
    let {updatedTime} = await this.publicSuffixListStorage.getValue();
    if (Date.now() - updatedTime < FirstPartyService.PSL_UPDATE_INTERVAL) {
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
    return this.registrableDomainService.getRegistrableDomain(url.href);
  }
}
