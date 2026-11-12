/* -*- indent-tabs-mode: nil; tab-width: 2; -*- */
/* vim: set ts=2 sw=2 et ai : */
/**
  Container Tab Groups
  Copyright (C) 2026 Menhera.org

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

import { config, GroupIndexOption } from '../../config/config';
import { TAB_GROUP_ID_NONE } from './NativeTabGroupPlanner';

/**
 * Containers shown as Firefox's native tab groups (background-native-tab-groups.ts keeps them in sync).
 * While sync is on, hiding a container collapses its group instead of hiding its tabs.
 */
export class NativeTabGroupService {
  private static readonly INSTANCE = new NativeTabGroupService();

  public static getInstance(): NativeTabGroupService {
    return NativeTabGroupService.INSTANCE;
  }

  private constructor() {
    // nothing.
  }

  /** Whether this Firefox offers the tab groups API to extensions. */
  public isSupported(): boolean {
    return !!browser.tabGroups && typeof browser.tabs.group == 'function';
  }

  public async isActive(): Promise<boolean> {
    return this.isSupported() && (await config['tab.groups.nativeSync'].getValue());
  }

  /** Index tabs are not used while containers are native groups. */
  public async getEffectiveIndexOption(): Promise<GroupIndexOption> {
    if (await this.isActive()) return 'never';
    return await config['tab.groups.indexOption'].getValue();
  }

  /** The group holding the container's unpinned tabs in the window, if it has one. */
  public async getContainerGroupId(windowId: number, cookieStoreId: string): Promise<number | undefined> {
    const browserTabs = await browser.tabs.query({ windowId, cookieStoreId, pinned: false });
    const groupId = browserTabs.find(
      (browserTab) => (browserTab.groupId ?? TAB_GROUP_ID_NONE) != TAB_GROUP_ID_NONE
    )?.groupId;
    return groupId ?? undefined;
  }

  /** Collapses or expands the container's group. Returns false when the container has no group in the window. */
  public async setContainerCollapsed(windowId: number, cookieStoreId: string, collapsed: boolean): Promise<boolean> {
    const groupId = await this.getContainerGroupId(windowId, cookieStoreId);
    if (groupId === undefined) return false;
    // Showing runs on every tab activation, so only touch groups that change.
    if ((await browser.tabGroups.get(groupId)).collapsed != collapsed) {
      await browser.tabGroups.update(groupId, { collapsed });
    }
    return true;
  }

  /** IDs of the collapsed groups, which count as hidden containers while sync is on. */
  public async getCollapsedGroupIds(): Promise<number[]> {
    if (!(await this.isActive())) return [];
    return (await browser.tabGroups.query({ collapsed: true })).map((group) => group.id);
  }
}
