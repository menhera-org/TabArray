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

  public static fromId(cookieStoreId: string): CookieStore  {
    if (cookieStoreId === CookieStore.DEFAULT_STORE) {
      return new CookieStore({
        userContextId: 0 as Uint32.Uint32,
        privateBrowsingId: 0 as Uint32.Uint32,
      });
    } else if (cookieStoreId === CookieStore.PRIVATE_STORE) {
      return new CookieStore({
        userContextId: 0 as Uint32.Uint32,
        privateBrowsingId: 1 as Uint32.Uint32,
      });
    } else if (cookieStoreId.startsWith(CookieStore.CONTAINER_STORE)) {
      const userContextId = Uint32.fromString(cookieStoreId.slice(CookieStore.CONTAINER_STORE.length));
      return new CookieStore({
        userContextId,
        privateBrowsingId: 0 as Uint32.Uint32,
      });
    }
    throw new Error(`CookieStore.fromId(): invalid cookieStoreId: ${cookieStoreId}`);
  }

  public constructor(params: CookieStoreParams) {
    this.userContextId = params.userContextId;
    this.privateBrowsingId = params.privateBrowsingId;

    if (this.privateBrowsingId !== 0) {
      this.id = CookieStore.PRIVATE_STORE;
    } else if (this.userContextId === 0) {
      this.id = CookieStore.DEFAULT_STORE;
    } else {
      this.id = `${CookieStore.CONTAINER_STORE}${this.userContextId}`;
    }
  }

  public get isPrivate(): boolean {
    return this.privateBrowsingId !== 0;
  }

  public toString(): string {
    return this.id;
  }
}
