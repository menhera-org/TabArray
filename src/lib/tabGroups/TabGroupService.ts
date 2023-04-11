// -*- indent-tabs-mode: nil; tab-width: 2; -*-
// vim: set ts=2 sw=2 et ai :

/*
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
*/

import browser from 'webextension-polyfill';

import { ServiceRegistry } from '../ServiceRegistry';
import { TabGroupDirectory } from "./TabGroupDirectory";
import { TabGroupOptionDirectory } from './TabGroupOptionDirectory';
import { TabGroupAttributes } from './TabGroupAttributes';
import { ContentStorageStatistics } from '../../cookies/ContentStorageStatistics';

/**
 * Doing operations on tab groups.
 */
export class TabGroupService {
  private static readonly INSTANCE = new TabGroupService();

  public static getInstance(): TabGroupService {
    return TabGroupService.INSTANCE;
  }

  public readonly directory = new TabGroupDirectory();
  public readonly optionDirectory = new TabGroupOptionDirectory();
  public readonly contentStorageStatistics = new ContentStorageStatistics();

  private constructor() {
    // nothing.
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

  public async removeBrowsingDataForTabGroupId(tabGroupId: string): Promise<void> {
    const attributes = new TabGroupAttributes(tabGroupId);
    if (attributes.tabGroupType == 'cookieStore') {
      const cookieStoreId = tabGroupId;

      await browser.browsingData.remove({
        cookieStoreId,
      }, {
        cookies: true,
        localStorage: true, // not supported on old Firefox
        indexedDB: true,
      });
      await this.contentStorageStatistics.removeCookieStore(cookieStoreId);
    } else {
      const cookieStoreIds = await this.directory.getChildContainers(tabGroupId);
      await Promise.all(cookieStoreIds.map((cookieStoreId) => this.removeBrowsingDataForTabGroupId(cookieStoreId)));
    }
  }
}

ServiceRegistry.getInstance().registerService('TabGroupService', TabGroupService.getInstance());
