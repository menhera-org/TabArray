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

import { CookieStore } from "weeg-containers";

export type TabGroupType = 'supergroup' | 'cookieStore';

export class TabGroupAttributes {
  private static readonly SUPERGROUP_PREFIX = 'tabarray-supergroup-';

  public static getTabGroupIdFromSupergroupId(supergroupId: number): string {
    return TabGroupAttributes.SUPERGROUP_PREFIX + supergroupId;
  }

  public readonly tabGroupType: TabGroupType;
  public readonly supergroupId: number | null;
  public readonly cookieStore: CookieStore | null;

  public constructor(tabGroupId: string) {
    if (tabGroupId.startsWith(TabGroupAttributes.SUPERGROUP_PREFIX)) {
      this.tabGroupType = 'supergroup';
      const supergroupId = parseInt(tabGroupId.slice(TabGroupAttributes.SUPERGROUP_PREFIX.length), 10);
      if (isNaN(supergroupId)) {
        throw new TypeError('Invalid supergroup ID: ' + tabGroupId);
      }
      this.supergroupId = supergroupId;
      this.cookieStore = null;
    } else {
      this.tabGroupType = 'cookieStore';
      this.supergroupId = null;
      this.cookieStore = new CookieStore(tabGroupId);
    }
  }
}
