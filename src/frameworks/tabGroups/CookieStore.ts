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
import { CookieStoreParams } from "./CookieStoreParams";

export class CookieStore implements CookieStoreParams {
  private static readonly DEFAULT_STORE = 'firefox-default';
  private static readonly PRIVATE_STORE = 'firefox-private';
  private static readonly CONTAINER_STORE = 'firefox-container-';

  public readonly id: string;
  public readonly userContextId: Uint32.Uint32;
  public readonly privateBrowsingId: Uint32.Uint32;

  public static fromParams(params: CookieStoreParams): CookieStore {
    if (params.privateBrowsingId !== 0) {
      return new CookieStore(CookieStore.PRIVATE_STORE);
    }
    if (params.userContextId === 0) {
      return new CookieStore(CookieStore.DEFAULT_STORE);
    }
    return new CookieStore(`${CookieStore.CONTAINER_STORE}${params.userContextId}`);
  }

  public constructor(cookieStoreId: string) {
    this.id = cookieStoreId;

    if (cookieStoreId === CookieStore.DEFAULT_STORE) {
      this.userContextId = 0 as Uint32.Uint32;
      this.privateBrowsingId = 0 as Uint32.Uint32;
    } else if (cookieStoreId === CookieStore.PRIVATE_STORE) {
      this.userContextId = 0 as Uint32.Uint32;
      this.privateBrowsingId = 1 as Uint32.Uint32;
    } else if (cookieStoreId.startsWith(CookieStore.CONTAINER_STORE)) {
      const userContextId = Uint32.fromString(cookieStoreId.slice(CookieStore.CONTAINER_STORE.length));
      this.userContextId = userContextId;
      this.privateBrowsingId = 0 as Uint32.Uint32;
    }
    throw new Error(`CookieStore.constructor(): invalid cookieStoreId: ${cookieStoreId}`);
  }

  public get isPrivate(): boolean {
    return this.privateBrowsingId !== 0;
  }

  public toString(): string {
    return this.id;
  }
}
