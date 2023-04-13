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
import { RegistrableDomainService } from 'weeg-domains';
import { HostnameService } from 'weeg-domains';

export class CookieProvider {
  private readonly _registrableDomainService = RegistrableDomainService.getInstance<RegistrableDomainService>();
  private readonly _hostnameService = HostnameService.getInstance();

  private getDomainsForCookies(cookies: browser.Cookies.Cookie[]): string[] {
    const domains: Set<string> = new Set;
    for (const cookie of cookies) {
      const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
      domains.add(domain);
    }
    return this._hostnameService.sortDomains(domains);
  }

  private async getCookiesForFirstPartyDomain(cookieStoreId: string, firstPartyDomain: string): Promise<browser.Cookies.Cookie[]> {
    const partitionKey = {};
    return await browser.cookies.getAll({
      firstPartyDomain,
      partitionKey,
      storeId: cookieStoreId,
    });
  }

  public async getCookieDomainsForFirstPartyDomain(cookieStoreId: string, firstPartyDomain: string): Promise<string[]> {
    const cookies = await this.getCookiesForFirstPartyDomain(cookieStoreId, firstPartyDomain);
    return this.getDomainsForCookies(cookies);
  }

  public async getCookieRegistrableDomainsForFirstPartyDomain(cookieStoreId: string, firstPartyDomain: string): Promise<string[]> {
    const domains = await this.getCookieDomainsForFirstPartyDomain(cookieStoreId, firstPartyDomain);
    return await this._registrableDomainService.getUniqueRegistrableDomains(domains.map((domain) => `http://${domain}`));
  }

  public async getFirstPartyDomainsForCookieStoreId(cookieStoreId: string): Promise<string[]> {
    const partitionKey = {};
    const cookies = await browser.cookies.getAll({
      storeId: cookieStoreId,
      firstPartyDomain: null,
      partitionKey,
    });
    const domains = new Set<string>();
    for (const cookie of cookies) {
      domains.add(cookie.firstPartyDomain);
    }
    return this._hostnameService.sortDomains(domains);
  }

  public async removeDataForDomain(cookieStoreId: string, domain: string): Promise<void> {
    const hostnames = [domain];
    await browser.browsingData.remove({
      hostnames,
      originTypes: {
        unprotectedWeb: true,
      },
      cookieStoreId,
    }, {
      cookies: true,
      localStorage: true,
      indexedDB: true,
    });
  }
}
