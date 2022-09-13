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

import { Uint32 } from "../types";
import { FirstPartyService } from "./FirstPartyService";

/**
 * The origin attributes of a tab.
 * This differs from Mozilla definition in that it does not have partitionKey.
 * If you really need it, please issue a pull request.
 * For firstPartyDomain, empty string is used as a wild card.
 * For userContextId and privateBrowsingId, null is used as a wild card.
 */
export class OriginAttributes {
  /**
   * OriginAttributes with no values.
   */
  public static readonly DEFAULT = new OriginAttributes();

  private static readonly DEFAULT_STORE = 'firefox-default';
  private static readonly PRIVATE_STORE = 'firefox-private';
  private static readonly CONTAINER_STORE = 'firefox-container-';

  public readonly firstpartyDomain: string;
  public readonly userContextId: Uint32.Uint32 | null;
  public readonly privateBrowsingId: Uint32.Uint32 | null;

  public static fromString(str: string): OriginAttributes {
    if (str === '') {
      return OriginAttributes.DEFAULT;
    }
    if (!str.startsWith('^')) {
      throw new Error(`OriginAttributes.fromString: invalid string: ${str}`);
    }
    const parts = str.slice(1).split('&');
    const attrs = {... new OriginAttributes()};
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (!value) {
        throw new Error(`OriginAttributes.fromString: invalid string: ${str}`);
      }
      switch (key) {
        case 'firstPartyDomain':
          attrs.firstpartyDomain = value;
          break;
        case 'userContextId':
          attrs.userContextId = Uint32.fromString(value);
          break;
        case 'privateBrowsingId':
          attrs.privateBrowsingId = Uint32.fromString(value);
          break;
        default:
          throw new Error(`OriginAttributes.fromString: invalid string: ${str}`);
      }
    }

    return new OriginAttributes(attrs.firstpartyDomain, attrs.userContextId, attrs.privateBrowsingId);
  }

  public static fromCookieStoreId(cookieStoreId: string, url?: string): OriginAttributes {
    const firstPartyService = FirstPartyService.getInstance();
    let firstPartyDomain = '';
    if (url) {
      firstPartyDomain = firstPartyService.getRegistrableDomain(new URL(url));
    }
    if (cookieStoreId === OriginAttributes.DEFAULT_STORE) {
      return new OriginAttributes(firstPartyDomain, 0 as Uint32.Uint32, 0 as Uint32.Uint32);
    }
    if (cookieStoreId === OriginAttributes.PRIVATE_STORE) {
      return new OriginAttributes(firstPartyDomain, 0 as Uint32.Uint32, 1 as Uint32.Uint32);
    }
    if (cookieStoreId.startsWith(OriginAttributes.CONTAINER_STORE)) {
      const userContextId = Uint32.fromString(cookieStoreId.slice(OriginAttributes.CONTAINER_STORE.length));
      return new OriginAttributes(firstPartyDomain, userContextId, 0 as Uint32.Uint32);
    }
    throw new Error(`OriginAttributes.fromCookieStoreId: invalid cookieStoreId: ${cookieStoreId}`);
  }

  public constructor(firstpartyDomain = '', userContextId: Uint32.Uint32 | null = null, privateBrowsingId: Uint32.Uint32 | null = null) {
    if (userContextId !== 0 && userContextId !== null && privateBrowsingId != 0 && privateBrowsingId != null) {
      throw new Error('UserContextId must be 0 for private browsing');
    }
    this.firstpartyDomain = firstpartyDomain;
    this.userContextId = userContextId;
    this.privateBrowsingId = privateBrowsingId;
  }

  public hasFirstpartyDomain(): boolean {
    return this.firstpartyDomain !== '';
  }

  public hasUserContextId(): boolean {
    return this.userContextId !== null;
  }

  public hasPrivateBrowsingId(): boolean {
    return this.privateBrowsingId !== null;
  }

  public isPrivateBrowsing(): boolean {
    return this.privateBrowsingId === 1;
  }

  public hasWildCard(): boolean {
    return this.firstpartyDomain === '' || this.userContextId === null || this.privateBrowsingId === null;
  }

  public hasCookieStoreId(): boolean {
    return this.hasUserContextId() || this.isPrivateBrowsing();
  }

  public get cookieStoreId(): string {
    if (this.isPrivateBrowsing()) {
      return OriginAttributes.PRIVATE_STORE;
    }
    if (this.userContextId === 0) {
      return OriginAttributes.DEFAULT_STORE;
    }
    if (this.userContextId === null) {
      throw new Error('OriginAttributes.cookieStoreId: userContextId is null');
    }
    return OriginAttributes.CONTAINER_STORE + this.userContextId;
  }

  public equals(other: OriginAttributes): boolean {
    return this.firstpartyDomain === other.firstpartyDomain
      && this.userContextId === other.userContextId
      && this.privateBrowsingId === other.privateBrowsingId;
  }

  public isDefault(): boolean {
    return this.equals(OriginAttributes.DEFAULT);
  }

  public getUrlPattern(): string {
    if (this.hasFirstpartyDomain()) {
      return `*://*.${this.firstpartyDomain}/*`;
    } else {
      return '<all_urls>';
    }
  }

  public toString(): string {
    if (this.isDefault()) {
      return '';
    }
    const parts = [];
    if (this.hasFirstpartyDomain()) {
      parts.push(`firstPartyDomain=${this.firstpartyDomain}`);
    }
    if (this.hasUserContextId()) {
      parts.push(`userContextId=${this.userContextId}`);
    }
    if (this.hasPrivateBrowsingId()) {
      parts.push(`privateBrowsingId=${this.privateBrowsingId}`);
    }
    return '^' + parts.join('&');
  }
}
