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

import { CompatTab } from "weeg-tabs";
import { SetMap } from "weeg-types";

export class CookieStoreTabMap {
  private readonly _map = new SetMap<string, CompatTab>();

  public constructor(tabs: Iterable<CompatTab>) {
    for (const tab of tabs) {
      this._map.addItem(tab.cookieStore.id, tab);
    }
  }

  public getCookieStoreIds(): string[] {
    return [... this._map.keys()];
  }

  public getTabsByCookieStoreId(cookieStoreId: string): CompatTab[] {
    return [... this._map.get(cookieStoreId) ?? []];
  }
}
