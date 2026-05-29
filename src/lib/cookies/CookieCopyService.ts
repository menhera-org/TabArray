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

import { ServiceRegistry } from '../ServiceRegistry';

export class CookieCopyService {
  private static readonly INSTANCE = new CookieCopyService();

  public static getInstance(): CookieCopyService {
    return CookieCopyService.INSTANCE;
  }

  private constructor() {
    // Do nothing
  }

  public async getCookiesForContainer(cookieStoreId: string): Promise<browser.Cookies.Cookie[]> {
    return browser.cookies.getAll({ storeId: cookieStoreId, firstPartyDomain: null });
  }

  public getUrlForCookie(cookie: browser.Cookies.Cookie): string {
    let domain = cookie.domain;
    if (domain.startsWith('.')) {
      domain = domain.substring(1);
    }
    const scheme = cookie.secure ? 'https:' : 'http:';
    return `${scheme}//${domain}${cookie.path}`;
  }

  private getSetCookieParams(cookie: browser.Cookies.Cookie, cookieStoreId: string): browser.Cookies.SetDetailsType {
    const params: browser.Cookies.SetDetailsType = {
      url: this.getUrlForCookie(cookie),
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      firstPartyDomain: cookie.firstPartyDomain,
      storeId: cookieStoreId,
    };
    if (!cookie.hostOnly) {
      params.domain = cookie.domain;
    }
    if (cookie.partitionKey) {
      params.partitionKey = cookie.partitionKey;
    }
    if (cookie.expirationDate) {
      params.expirationDate = cookie.expirationDate;
    }
    return params;
  }

  public async copyAllCookiesToContainer(fromCookieStore: string, toCookieStore: string): Promise<void> {
    const cookies = await this.getCookiesForContainer(fromCookieStore);
    for (const cookie of cookies) {
      await browser.cookies.set(this.getSetCookieParams(cookie, toCookieStore));
    }
  }
}

ServiceRegistry.getInstance().registerService('CookieCopyService', CookieCopyService.getInstance());
