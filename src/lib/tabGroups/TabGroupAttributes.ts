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

export enum TabGroupType {
  SUPERGROUP = 'supergroup',
  COOKIE_STORE = 'cookieStore',
}

export interface TabGroupFilter {
  supergroup: boolean;
  cookieStore: boolean;
}

const SUPERGROUP_PREFIX = 'tabarray-supergroup-';

export interface CommonTabGroupAttributes {
  tabGroupType: TabGroupType;
  tabGroupId: string;
}

export interface SupergroupTabGroupAttributes extends CommonTabGroupAttributes {
  tabGroupType: TabGroupType.SUPERGROUP;
  supergroupId: number;
}

export interface CookieStoreTabGroupAttributes extends CommonTabGroupAttributes {
  tabGroupType: TabGroupType.COOKIE_STORE;
  cookieStore: CookieStore;
}

/**
 * Attributes based on a tab group ID.
 */
export type TabGroupAttributes = SupergroupTabGroupAttributes | CookieStoreTabGroupAttributes;

export interface TabGroupAttributesConstructor {
  new(tabGroupId: string): TabGroupAttributes;

  /**
   * Numeric supergroupId of the root supergroup.
   */
  readonly ROOT_SUPERGROUP_ID: 0;

  /**
   * Calculates a string tabGroupId from numeric supergroupId.
   * @param supergroupId numeric supergroup ID
   */
  getTabGroupIdFromSupergroupId(supergroupId: number): string;

  /**
   * Returns the tabGroupId of the root supergroup.
   */
  getRootSupergroupTabGroupId(): string;
}

export const TabGroupAttributes: TabGroupAttributesConstructor = function (tabGroupId: string) {
  if (new.target == null) {
    throw new TypeError('Constructor called without new keyword');
  }
  if (tabGroupId.startsWith(SUPERGROUP_PREFIX)) {
    const supergroupId = parseInt(tabGroupId.slice(SUPERGROUP_PREFIX.length), 10);
    if (isNaN(supergroupId)) {
      throw new TypeError('Invalid supergroup ID: ' + tabGroupId);
    }
    return {
      tabGroupType: TabGroupType.SUPERGROUP,
      tabGroupId,
      supergroupId: supergroupId,
    } as SupergroupTabGroupAttributes;
  }
  const cookieStore = new CookieStore(tabGroupId);
  return {
    tabGroupType: TabGroupType.COOKIE_STORE,
    tabGroupId,
    cookieStore,
  } as CookieStoreTabGroupAttributes;
} as unknown as TabGroupAttributesConstructor;

Object.defineProperty(TabGroupAttributes, 'ROOT_SUPERGROUP_ID', {
  value: 0,
});

TabGroupAttributes.getTabGroupIdFromSupergroupId = (supergroupId: number): string => {
  return SUPERGROUP_PREFIX + supergroupId;
};

TabGroupAttributes.getRootSupergroupTabGroupId = (): string => {
  return TabGroupAttributes.getTabGroupIdFromSupergroupId(TabGroupAttributes.ROOT_SUPERGROUP_ID);
};
