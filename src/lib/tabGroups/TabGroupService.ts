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
import { StorageItem } from 'weeg-storage';

import { ServiceRegistry } from '../ServiceRegistry';
import { TabGroupDirectory } from "./TabGroupDirectory";
import { TabGroupOptionDirectory } from './TabGroupOptionDirectory';
import { TabGroupAttributes } from './TabGroupAttributes';
import { ContentStorageStatistics } from '../../legacy-lib/cookies/ContentStorageStatistics';
import { CookieStoreService } from './CookieStoreService';
import { StartupService } from '../StartupService';

const cookieStoreService = CookieStoreService.getInstance();
const startupService = StartupService.getInstance();

/**
 * Doing operations on tab groups.
 */
export class TabGroupService {
  private static readonly INSTANCE = new TabGroupService();

  public static getInstance(): TabGroupService {
    return TabGroupService.INSTANCE;
  }

  public readonly directory = TabGroupDirectory.getInstance();
  public readonly optionDirectory = new TabGroupOptionDirectory();
  public readonly contentStorageStatistics = new ContentStorageStatistics();

  private readonly _removingBrowsingDataCookieStoreIds = new StorageItem<string[]>('TabGroupService.removingBrowsingDataCookieStoreIds', [], StorageItem.AREA_LOCAL);

  private _removingBrowsingDataCookieStoreIdsCache: string[] | undefined;

  private constructor() {
    startupService.onStartup.addListener(() => {
      this.resetState();
    });
  }

  public async getTabGroupIds(): Promise<string[]> {
    const [cookieStores, tabGroupDirectorySnapshot] = await Promise.all([
      cookieStoreService.getCookieStores(),
      this.directory.getSnapshot(),
    ]);
    return [
      ... cookieStores.map((cookieStore) => cookieStore.id),
      ... tabGroupDirectorySnapshot.getSupergroupTabGroupIds(),
    ];
  }

  /**
   * This returns the private browsing cookie store ID, too.
   */
  public async getOpenTabGroupIds(): Promise<string[]> {
    const [browserTabs, tabGroupDirectorySnapshot] = await Promise.all([
      browser.tabs.query({}),
      this.directory.getSnapshot(),
    ]);

    const cookieStoreIds = new Set<string>();
    for (const browserTab of browserTabs) {
      if (null == browserTab.cookieStoreId) {
        continue;
      }
      cookieStoreIds.add(browserTab.cookieStoreId);
    }
    const tabGroupIds = new Set<string>();
    for (const cookieStoreId of cookieStoreIds) {
      let tabGroupId: string | undefined = cookieStoreId;
      while (tabGroupId != null && !tabGroupIds.has(tabGroupId)) {
        tabGroupIds.add(tabGroupId);
        tabGroupId = tabGroupDirectorySnapshot.getParentTabGroupId(tabGroupId);
      }
    }
    return [... tabGroupIds];
  }

  /**
   * Should be called only on startup.
   */
  private async resetState(): Promise<void> {
    await this._removingBrowsingDataCookieStoreIds.setValue([]);
  }

  private async removeBrowsingDataForCookieStoreIdInternal(cookieStoreId: string): Promise<void> {
    await browser.browsingData.remove({
      cookieStoreId,
    }, {
      cookies: true,
      localStorage: true, // not supported on old Firefox
      indexedDB: true,
    });
    await this.contentStorageStatistics.removeCookieStore(cookieStoreId);
  }

  private async removeBrowsingDataForCookieStoreId(cookieStoreId: string): Promise<void> {
    if (null != this._removingBrowsingDataCookieStoreIdsCache && this._removingBrowsingDataCookieStoreIdsCache.includes(cookieStoreId)) {
      return;
    }
    const removingCookieStoreIds = await this._removingBrowsingDataCookieStoreIds.getValue();
    if (removingCookieStoreIds.includes(cookieStoreId)) {
      return;
    }
    removingCookieStoreIds.push(cookieStoreId);
    this._removingBrowsingDataCookieStoreIdsCache = removingCookieStoreIds;
    await this._removingBrowsingDataCookieStoreIds.setValue(removingCookieStoreIds);

    try {
      await this.removeBrowsingDataForCookieStoreIdInternal(cookieStoreId);
    } finally {
      const removingCookieStoreIds = await this._removingBrowsingDataCookieStoreIds.getValue();
      const index = removingCookieStoreIds.indexOf(cookieStoreId);
      if (index >= 0) {
        removingCookieStoreIds.splice(index, 1);
      }
      this._removingBrowsingDataCookieStoreIdsCache = removingCookieStoreIds;
      await this._removingBrowsingDataCookieStoreIds.setValue(removingCookieStoreIds);
    }
  }

  public async removeBrowsingDataForTabGroupId(tabGroupId: string): Promise<void> {
    const attributes = new TabGroupAttributes(tabGroupId);
    if (attributes.tabGroupType == 'cookieStore') {
      const cookieStoreId = tabGroupId;
      await this.removeBrowsingDataForCookieStoreId(cookieStoreId);
    } else {
      const cookieStoreIds = await this.directory.getChildContainers(tabGroupId);
      await Promise.all(cookieStoreIds.map((cookieStoreId) => this.removeBrowsingDataForTabGroupId(cookieStoreId)));
    }
  }
}

ServiceRegistry.getInstance().registerService('TabGroupService', TabGroupService.getInstance());
